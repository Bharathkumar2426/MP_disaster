import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function MainLayout({ children }) {
    return (
        <div className="d-flex" style={{ height: "100vh", overflow: "hidden" }}>

            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div
                className="d-flex flex-column flex-grow-1"
                style={{
                    minWidth: 0,
                    overflow: "hidden"
                }}
            >

                {/* Navbar */}
                <Navbar />

                {/* Page Content */}
                <div
                    className="flex-grow-1"
                    style={{
                        overflowY: "auto",
                        background:"transparent",
                        padding: "25px"
                    }}
                >
                    {children}
                </div>

            </div>

        </div>
    );
}

export default MainLayout;