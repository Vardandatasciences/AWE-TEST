import React from "react";

const UserDashboard = () => {
  return (
    <div>
      {/* Navbar with only "AWE" */}
      <nav style={{ backgroundColor: "#1f3b50", padding: "10px", color: "white" }}>
        <h2 style={{ marginLeft: "20px" }}>ProSync</h2>
      </nav>

      {/* Task Categories */}
      <div style={{ padding: "20px", textAlign: "center", fontSize: "18px", fontWeight: "bold", marginTop: "20px" }}>
        Regulatory | Upto Today | Overdue | Today | Future Tasks | Completed Tasks
      </div>
    </div>
  );
};

export default UserDashboard;
