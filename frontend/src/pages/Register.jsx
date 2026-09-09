import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";


function Register() {

    const navigate = useNavigate();


    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");


    const handleRegister = (e) => {

        e.preventDefault();


        if(name && email && password){

            alert("Registration Successful");

            navigate("/");

        }
        else{

            alert("Please fill all fields");

        }

    };


    return (

        <div className="register-container">


            <h1>PillSync</h1>

            <h2>Create Account</h2>


            <form onSubmit={handleRegister}>


                <label>Name</label>

                <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e)=>setName(e.target.value)}
                />



                <label>Email</label>

                <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                />



                <label>Password</label>

                <input
                    type="password"
                    placeholder="Create password"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                />



                <button type="submit">
                    Register
                </button>


            </form>


            <p>
                Already have an account?

                <span 
                onClick={()=>navigate("/")}
                className="login-link">

                    Login

                </span>

            </p>


        </div>

    );

}


export default Register;