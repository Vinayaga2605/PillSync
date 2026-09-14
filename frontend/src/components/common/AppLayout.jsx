import React, { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AIAssistantDrawer from "./AIAssistantDrawer";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-layout-content">
        <TopBar
          onMenuClick={() =>
            setSidebarOpen((open) => !open)
          }
        />

        <div className="page-body">
          <Outlet />
        </div>
      </div>

      <AIAssistantDrawer />
    </div>
  );
};

export default AppLayout;
