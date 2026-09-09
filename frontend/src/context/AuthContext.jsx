import {createContext,useState} from "react";

import {
    setToken,
    removeToken,
    getToken
}
from "../utils/token";


export const AuthContext=createContext();


export const AuthProvider=({children})=>{


const [token,setUserToken]=useState(getToken());


const login=(token)=>{

    setToken(token);
    setUserToken(token);

};


const logout=()=>{

    removeToken();
    setUserToken(null);

};


return(

<AuthContext.Provider

value={{
    token,
    login,
    logout
}}

>

{children}

</AuthContext.Provider>


);


};