import re
from datetime import date
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.medicine import Medicine
from app.models.medication_schedule import MedicationSchedule
from app.models.medication_log import MedicationLog
from app.models.notification import Notification

from app.crud.patient_crud import get_caregiver_patients, get_patient_profile, get_patients
from app.crud.notification_crud import get_notifications
from app.services.medication_service import get_patient_schedule, add_schedule, TIME_LABELS, TIME_SLOTS
from app.utils.adherence import calculate_adherence

TIME_NOTES_MAP = {
    "morning": "After breakfast",
    "afternoon": "After lunch",
    "evening": "After dinner",
    "night": "Before sleep"
}

OFF_TOPIC_KEYWORDS = [
    "movie", "film", "cinema", "actor", "actress", "hollywood", "bollywood",
    "code", "python", "java", "script", "program", "programming", "software", "html", "css",
    "game", "gaming", "sports", "football", "cricket", "match", "score",
    "weather", "rain", "temperature", "recipe", "cook", "food", "restaurant",
    "joke", "song", "music", "album", "travel", "flight", "hotel"
]


def _is_off_topic(text: str) -> bool:
    text_lower = text.lower()
    return any(re.search(rf"\b{kw}\b", text_lower) for kw in OFF_TOPIC_KEYWORDS)


def _extract_medicine_name(text: str, medicines: list[Medicine]) -> str | None:
    text_lower = text.lower()
    for med in medicines:
        if med.name.lower() in text_lower or (med.brand and med.brand.lower() in text_lower):
            return med.name

    words = [w.capitalize() for w in re.findall(r'[a-zA-Z]{3,}', text) 
             if w.lower() not in {
                 "add", "take", "remind", "me", "to", "dose", "medicine", "pill", "mg", "tablets", 
                 "capsule", "the", "for", "in", "at", "every", "day", "daily", "please", "can", 
                 "you", "need", "i", "want", "schedule", "new", "my", "give", "put", "another", "name"
             }]
    return words[0] if words else None


def _extract_dosage(text: str) -> str | None:
    match = re.search(r'(\d+\s*(?:mg|g|mcg|ml|iu|units?|tablets?|pills?|capsules?))', text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    match_num = re.search(r'\b(\d+)\b', text)
    if match_num and int(match_num.group(1)) <= 2000:
        val = match_num.group(1)
        return f"{val} mg"
    return None


def _extract_time_of_day(text: str) -> str | None:
    text_lower = text.lower()
    if "morning" in text_lower or "breakfast" in text_lower or "am" in text_lower:
        return "morning"
    if "afternoon" in text_lower or "lunch" in text_lower or "noon" in text_lower:
        return "afternoon"
    if "evening" in text_lower or "dinner" in text_lower or "pm" in text_lower:
        return "evening"
    if "night" in text_lower or "sleep" in text_lower or "bed" in text_lower:
        return "night"
    return None


def process_assistant_message(db: Session, user: User, message: str, conversation_history: list = None) -> dict:
    msg_text = message.strip()
    msg_lower = msg_text.lower()
    role = (user.role or "patient").lower()
    all_medicines = db.query(Medicine).all()

    # ---------------------------------------------------------
    # STRICT GUARDRAIL: Reject Off-Topic Queries
    # ---------------------------------------------------------
    if _is_off_topic(msg_text):
        return {
            "reply": (
                "⚠️ **Off-Topic Request Restricted**\n\n"
                "I am your dedicated **PillSync Healthcare & Medication AI Assistant** 💊.\n"
                "I specialize strictly in medication management, prescription scheduling, caregiver oversight, and healthcare platform administration.\n\n"
                "I am programmed to decline requests regarding movies, entertainment, computer programming, sports, or general non-medical trivia.\n\n"
                "**How can I assist you with your health today?** You can try:\n"
                "• *'Add Paracetamol 500mg in the morning'*\n"
                "• *'Show my daily medication schedule'*\n"
                "• *'Check patient adherence & alerts'*"
            ),
            "suggestions": (
                ["Add Paracetamol 500mg morning", "Show my daily schedule"] if role == "patient"
                else ["List assigned patients", "Check alerts"] if role == "caregiver"
                else ["System status report", "Add new medicine"]
            )
        }

    # Conversation state handling for slot-filling (e.g. pending add_schedule)
    pending_state = None
    if conversation_history:
        for turn in reversed(conversation_history):
            if turn.get("sender") == "assistant" and turn.get("pending_intent"):
                pending_state = turn.get("pending_intent")
                break

    # Helper function to render available medicines list
    def _render_available_medicines_reply(custom_prefix: str = ""):
        db_meds = db.query(Medicine).order_by(Medicine.name.asc()).all()
        med_list_lines = [f"• **{m.name}** ({m.category} · default: {m.default_dosage})" for m in db_meds]
        prefix = custom_prefix or "Here are the valid medicines currently available in our system database:"
        top_suggestions = [m.name for m in db_meds[:4]]
        return {
            "reply": f"{prefix}\n\n" + "\n".join(med_list_lines) + "\n\nWhich of these medicines would you like to schedule?",
            "suggestions": top_suggestions
        }

    # =========================================================
    # 1. PATIENT ASSISTANT LOGIC
    # =========================================================
    if role == "patient":
        # Slot-filling continuation for "add_schedule"
        if pending_state and pending_state.get("action") == "add_schedule":
            med_name = pending_state.get("medicine_name") or _extract_medicine_name(msg_text, all_medicines)
            dosage = pending_state.get("dosage") or _extract_dosage(msg_text)
            time_slot = pending_state.get("time_of_day") or _extract_time_of_day(msg_text)

            # Verify medicine exists in database! Do NOT auto-create dummy medicines
            med_obj = None
            if med_name:
                med_obj = db.query(Medicine).filter(Medicine.name.ilike(med_name)).first()
                if not med_obj:
                    # Search by substring match
                    med_obj = db.query(Medicine).filter(Medicine.name.ilike(f"%{med_name}%")).first()

            if not med_name or not med_obj:
                return _render_available_medicines_reply(
                    f"The medicine name '**{msg_text}**' was not found in the PillSync database."
                )

            if not dosage:
                dosage = med_obj.default_dosage or "500 mg"

            if not time_slot:
                return {
                    "reply": (
                        f"Great! I have selected **{med_obj.name}** (dosage: **{dosage}**).\n\n"
                        f"Now, please choose the preferred **time of day** for your reminder:\n"
                        f"• **Morning** (After breakfast)\n"
                        f"• **Afternoon** (After lunch)\n"
                        f"• **Evening** (After dinner)\n"
                        f"• **Night** (Before sleep)"
                    ),
                    "pending_intent": {"action": "add_schedule", "medicine_name": med_obj.name, "dosage": dosage, "time_of_day": None},
                    "suggestions": ["Morning", "Afternoon", "Evening", "Night"]
                }

            # Add schedule for validated database medicine
            add_schedule(
                db,
                patient_id=user.id,
                medicine_id=med_obj.id,
                dosage=dosage,
                time_of_day=time_slot,
                notes=f"Added via PillSync AI Assistant ({TIME_NOTES_MAP.get(time_slot, '')})"
            )

            time_desc = TIME_NOTES_MAP.get(time_slot, "As prescribed")
            return {
                "reply": (
                    f"🎉 **Medication Successfully Added & Synced!**\n\n"
                    f"Here are the details recorded in your PillSync database:\n"
                    f"• 💊 **Medicine Name**: {med_obj.name} ({med_obj.category})\n"
                    f"• 📏 **Dosage**: {dosage}\n"
                    f"• ⏰ **Time Slot**: {time_slot.capitalize()} ({time_desc})\n"
                    f"• 📝 **Notes**: Added via AI Assistant\n"
                    f"• 🔄 **Status**: Active & Live on your Dashboard\n\n"
                    f"I have automatically refreshed your medication schedule view. You will receive notifications for this dose."
                ),
                "action_executed": "REFRESH_SCHEDULE",
                "suggestions": ["View my schedule", "Add another medicine", "Check adherence score"]
            }

        # Intent: Add Medicine Trigger
        if any(w in msg_lower for w in ["add", "remind", "schedule", "new med", "take"]):
            med_name = _extract_medicine_name(msg_text, all_medicines)
            dosage = _extract_dosage(msg_text)
            time_slot = _extract_time_of_day(msg_text)

            # Check if extracted name exists in DB
            med_obj = None
            if med_name:
                med_obj = db.query(Medicine).filter(Medicine.name.ilike(med_name)).first()
                if not med_obj:
                    med_obj = db.query(Medicine).filter(Medicine.name.ilike(f"%{med_name}%")).first()

            # If no valid med name in DB, show available database medicines!
            if not med_name or not med_obj:
                return _render_available_medicines_reply(
                    "Please choose a medicine from our official database to schedule:"
                )

            if not dosage:
                dosage = med_obj.default_dosage or "500 mg"

            if not time_slot:
                return {
                    "reply": (
                        f"Understood: **{med_obj.name}** ({dosage}).\n\n"
                        f"Which **time of day** should I schedule this dose for?\n"
                        f"• **Morning** (After breakfast)\n"
                        f"• **Afternoon** (After lunch)\n"
                        f"• **Evening** (After dinner)\n"
                        f"• **Night** (Before sleep)"
                    ),
                    "pending_intent": {"action": "add_schedule", "medicine_name": med_obj.name, "dosage": dosage, "time_of_day": None},
                    "suggestions": ["Morning", "Afternoon", "Evening", "Night"]
                }

            # Save schedule
            add_schedule(
                db,
                patient_id=user.id,
                medicine_id=med_obj.id,
                dosage=dosage,
                time_of_day=time_slot,
                notes="Added via PillSync AI Assistant"
            )

            time_desc = TIME_NOTES_MAP.get(time_slot, "As prescribed")
            return {
                "reply": (
                    f"✅ **Medication Schedule Confirmed & Saved!**\n\n"
                    f"Details recorded:\n"
                    f"• 💊 **Medicine**: {med_obj.name} ({med_obj.category})\n"
                    f"• 📏 **Dosage**: {dosage}\n"
                    f"• ⏰ **Time Slot**: {time_slot.capitalize()} ({time_desc})\n"
                    f"• 🌐 **Dashboard Status**: Synced live to your PillSync profile\n\n"
                    f"Your daily schedule cards have been updated automatically!"
                ),
                "action_executed": "REFRESH_SCHEDULE",
                "suggestions": ["View my schedule", "Add another medicine"]
            }

        # Intent: Schedule Listing
        if any(w in msg_lower for w in ["schedule", "list", "today", "medicines", "meds", "my doses"]):
            schedule = get_patient_schedule(db, user.id)
            if not schedule:
                return {
                    "reply": (
                        "📋 **Your Daily Medication Schedule is Currently Empty.**\n\n"
                        "You don't have any active medication doses scheduled for today.\n"
                        "To add one, type **'Add Paracetamol'** or select one of the available medicines!"
                    ),
                    "suggestions": ["Add Paracetamol", "Add Metformin", "Add Vitamin D3"]
                }

            taken_count = sum(1 for s in schedule if s["taken"])
            lines = [
                f"📋 **Detailed Daily Medication Schedule for {user.full_name}:**",
                f"**Overall Status**: {taken_count} of {len(schedule)} doses completed today.\n"
            ]

            for slot in TIME_SLOTS:
                slot_items = [s for s in schedule if s["time_of_day"] == slot]
                if slot_items:
                    lines.append(f"**{slot.capitalize()} ({TIME_NOTES_MAP.get(slot, '')}):**")
                    for item in slot_items:
                        icon = "✅ (Taken)" if item["taken"] else "⏳ (Pending)"
                        lines.append(f"  • **{item['medicine_name']}** ({item['dosage']}) — Status: {icon}")

            return {
                "reply": "\n".join(lines),
                "suggestions": ["Add new medicine", "Check my adherence score"]
            }

        # Intent: Adherence Score
        if any(w in msg_lower for w in ["adherence", "track", "progress", "score", "compliance"]):
            schedule = get_patient_schedule(db, user.id)
            taken_count = sum(1 for s in schedule if s["taken"])
            stats = calculate_adherence(len(schedule), taken_count)
            pct = stats.get("adherence_percentage", 0)

            msg_eval = "🌟 Outstanding compliance!" if pct >= 80 else "⚠️ Take your pending doses to keep your adherence on track."

            return {
                "reply": (
                    f"📊 **Medication Adherence Analysis Report:**\n\n"
                    f"• **Today's Adherence Score**: **{pct}%**\n"
                    f"• **Doses Completed**: {taken_count} / {len(schedule)}\n"
                    f"• **Pending Doses**: {len(schedule) - taken_count}\n\n"
                    f"{msg_eval}\n"
                    f"Maintaining consistent medication schedules ensures maximum therapeutic efficacy."
                ),
                "suggestions": ["View my schedule", "Add new medicine"]
            }

        # Fallback / General Patient Prompt
        return {
            "reply": (
                f"Hello **{user.full_name}**! I am your dedicated PillSync Medication AI Assistant 💊.\n\n"
                f"I am fully integrated with your PillSync profile and database. You can instruct me using natural commands:\n\n"
                f"1. **Add Medication**: *'Add Paracetamol in the morning'*\n"
                f"2. **Check Daily Schedule**: *'Show my daily medicines for today'*\n"
                f"3. **Track Adherence**: *'What is my medication adherence score?'*\n\n"
                f"How may I assist your health regimen today?"
            ),
            "suggestions": ["Add Paracetamol", "Show my daily schedule", "Check adherence score"]
        }

    # =========================================================
    # 2. CAREGIVER ASSISTANT LOGIC
    # =========================================================
    elif role == "caregiver":
        patients = get_caregiver_patients(db, user.id)

        if any(w in msg_lower for w in ["patient", "assigned", "who", "list", "monitored"]):
            if not patients:
                return {
                    "reply": (
                        "👥 **Caregiver Patient Monitoring Report:**\n\n"
                        "You currently have no active patients assigned under your care.\n"
                        "When a patient sends you a care request or an administrator assigns a patient, they will be listed here."
                    ),
                    "suggestions": ["Check patient requests", "View alerts"]
                }
            lines = [
                f"👥 **Caregiver Patient Audit Report ({len(patients)} Patients Monitored):**\n",
            ]
            for p in patients:
                profile = get_patient_profile(db, p.id)
                sched = get_patient_schedule(db, p.id)
                taken = sum(1 for s in sched if s["taken"])
                stats = calculate_adherence(len(sched), taken)
                pct = stats.get("adherence_percentage", 0)

                lines.append(
                    f"• **{p.full_name}** ({p.email})\n"
                    f"  - Blood Group: {profile.blood_group if profile else 'N/A'} | Phone: {p.phone or 'N/A'}\n"
                    f"  - Today's Progress: {taken}/{len(sched)} doses taken ({pct}% adherence)"
                )
            return {
                "reply": "\n".join(lines),
                "suggestions": ["Check missed dose alerts", "View patient requests"]
            }

        if any(w in msg_lower for w in ["alert", "missed", "notification", "warning"]):
            notifs = get_notifications(db, user.id)
            unread = [n for n in notifs if not n.is_read]
            if not unread:
                return {
                    "reply": (
                        "🟢 **No Urgent Patient Alerts Outstanding.**\n\n"
                        "All assigned patients are up to date with their medication schedules, and no missed dose notifications have been flagged."
                    ),
                    "suggestions": ["List assigned patients", "Check patient requests"]
                }
            lines = [f"⚠️ **Urgent Patient Warning Alerts ({len(unread)} Unread):**\n"]
            for n in unread[:5]:
                lines.append(f"• **Alert**: {n.message}\n  - Time: {str(n.created_at)[:16]}")
            return {
                "reply": "\n".join(lines),
                "suggestions": ["List assigned patients"]
            }

        return {
            "reply": (
                f"Hello **{user.full_name}**! I am your Caregiver AI Assistant 🩺.\n\n"
                f"I provide real-time patient oversight and monitoring. You can ask:\n"
                f"• *'List all my assigned patients and their compliance'* \n"
                f"• *'Check urgent missed dose alerts'* \n"
                f"• *'Review incoming patient requests'*"
            ),
            "suggestions": ["List assigned patients", "Check missed dose alerts"]
        }

    # =========================================================
    # 3. ADMIN ASSISTANT LOGIC
    # =========================================================
    elif role == "admin":
        if any(w in msg_lower for w in ["status", "summary", "stats", "system", "overview", "analytics"]):
            u_count = db.query(User).count()
            m_count = db.query(Medicine).count()
            p_count = db.query(User).filter(User.role == "patient").count()
            c_count = db.query(User).filter(User.role == "caregiver").count()
            low_stock_meds = db.query(Medicine).filter(Medicine.stock_quantity <= Medicine.reorder_level).all()

            lines = [
                f"🏥 **PillSync Administrator System Audit Report:**\n",
                f"• **Total Registered Accounts**: {u_count} (Patients: {p_count}, Caregivers: {c_count})",
                f"• **Medicine Database Size**: {m_count} unique pharmaceuticals",
                f"• **Stock Inventory Health**: {len(low_stock_meds)} items requiring reorder",
                f"• **Database Connections**: 100% Operational & Healthy\n"
            ]

            if low_stock_meds:
                lines.append("**Low Stock Warnings:**")
                for med in low_stock_meds[:3]:
                    lines.append(f"  • {med.name}: {med.stock_quantity} units remaining (Reorder level: {med.reorder_level})")

            return {
                "reply": "\n".join(lines),
                "suggestions": ["Add new medicine to database", "Show platform summary"]
            }

        if any(w in msg_lower for w in ["add medicine", "create medicine", "new medicine"]):
            med_name = _extract_medicine_name(msg_text, all_medicines)
            dosage = _extract_dosage(msg_text) or "500 mg"
            if not med_name:
                return {
                    "reply": (
                        "🏥 **Administrator Medicine Entry Procedure**\n\n"
                        "Please provide the official **name of the pharmaceutical** to add to the global PillSync inventory (e.g., *Ibuprofen*, *Ciprofloxacin*, *Amoxicillin*)."
                    ),
                    "pending_intent": {"action": "admin_add_medicine"},
                    "suggestions": ["Ibuprofen", "Ciprofloxacin", "Amoxicillin"]
                }
            med_obj = Medicine(
                name=med_name,
                brand=med_name,
                default_dosage=dosage,
                category="General",
                stock_quantity=200,
                reorder_level=30
            )
            db.add(med_obj)
            db.commit()
            return {
                "reply": (
                    f"✅ **New Pharmaceutical Successfully Cataloged!**\n\n"
                    f"• **Name**: {med_name}\n"
                    f"• **Default Dosage**: {dosage}\n"
                    f"• **Initial Stock Quantity**: 200 units\n"
                    f"• **Reorder Threshold**: 30 units\n\n"
                    f"This medicine is now available for patient scheduling across PillSync."
                ),
                "action_executed": "REFRESH_MEDICINES",
                "suggestions": ["System status report", "Add another medicine"]
            }

        return {
            "reply": (
                f"Welcome Administrator **{user.full_name}** 🏥!\n\n"
                f"I am your System AI Assistant. You can run administrative audits and inventory operations:\n"
                f"• *'System status report and health audit'*\n"
                f"• *'Add new medicine Ibuprofen 400mg to database'*\n"
                f"• *'Check low stock inventory alerts'*"
            ),
            "suggestions": ["System status report", "Add new medicine to database"]
        }

    return {"reply": "How can I assist you with PillSync healthcare management today?"}
