import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function Profile() {

  return (

    <>
      <Navbar />

      <div className="d-flex">

        <Sidebar />

        <div className="container mt-4">

          <h2>My Profile</h2>

          <div className="card p-4 shadow">

            <p><strong>Name:</strong> Pavani</p>

            <p><strong>Email:</strong> pavani@gmail.com</p>

            <p><strong>Phone:</strong> 9876543210</p>

            <button className="btn btn-primary">
              Edit Profile
            </button>

          </div>

        </div>

      </div>

    </>

  );

}

export default Profile;