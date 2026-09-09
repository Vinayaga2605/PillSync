from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Medication
from .serializers import MedicationSerializer


class MedicationListCreateView(APIView):

    permission_classes = [IsAuthenticated]

    # GET - Get all medications of logged-in user
    def get(self, request):

        medications = Medication.objects.filter(
            user=request.user
        ).order_by("-created_at")

        serializer = MedicationSerializer(
            medications,
            many=True
        )

        return Response(serializer.data)

    # POST - Add a new medication
    def post(self, request):

        serializer = MedicationSerializer(
            data=request.data
        )

        if serializer.is_valid():

            medication = serializer.save(
                user=request.user
            )

            return Response(
                MedicationSerializer(medication).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class MedicationDetailView(APIView):

    permission_classes = [IsAuthenticated]

    # GET - Get one medication
    def get(self, request, medication_id):

        try:
            medication = Medication.objects.get(
                id=medication_id,
                user=request.user
            )

        except Medication.DoesNotExist:

            return Response(
                {"error": "Medication not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = MedicationSerializer(medication)

        return Response(serializer.data)

    # PUT - Update medication
    def put(self, request, medication_id):

        try:
            medication = Medication.objects.get(
                id=medication_id,
                user=request.user
            )

        except Medication.DoesNotExist:

            return Response(
                {"error": "Medication not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = MedicationSerializer(
            medication,
            data=request.data
        )

        if serializer.is_valid():

            serializer.save()

            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # DELETE - Delete medication
    def delete(self, request, medication_id):

        try:
            medication = Medication.objects.get(
                id=medication_id,
                user=request.user
            )

        except Medication.DoesNotExist:

            return Response(
                {"error": "Medication not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        medication.delete()

        return Response({
            "message": "Medication deleted successfully"
        })