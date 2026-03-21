import os

from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget,
    QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QTextEdit, QTabWidget
)
import sys

from security.license_manager import get_license_info, verify_license
from ui.automation_controller import (
    start_automation,
    stop_automation,
    pause_automation,
    resume_automation
)
from ui.csv_editor import CsvEditor
from ui.config_editor import ConfigEditor
from security.machine_lock import get_machine_id
from PySide6.QtWidgets import QMessageBox
from PySide6.QtWidgets import QLineEdit
from ui.state_helper import app_path



class Dashboard(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Forest Automation - Officer Dashboard")
        self.setGeometry(300, 100, 1100, 650)

        # ✅ ONE central widget
        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)

        # ✅ ROOT layout (horizontal)
        main_layout = QHBoxLayout()
        central_widget.setLayout(main_layout)

        # ================= LEFT PANEL =================
        left_panel = QLabel("Flows\n(Coming Soon)")
        left_panel.setFixedWidth(150)
        left_panel.setStyleSheet("background:#2b2b2b; padding:10px;")

        # ================= CENTER PANEL =================
        center_panel = QWidget()
        center_layout = QVBoxLayout()
        center_panel.setLayout(center_layout)

        self.status = QLabel("Status: Idle")
        self.logs = QTextEdit()
        self.logs.setReadOnly(True)
        self.license_input = QLineEdit()
        self.license_input.setPlaceholderText("Enter License Key")
        self.license_label = QLabel("License: Not Activated")

        btn_machine = QPushButton("Show Machine ID")
        btn_start = QPushButton("▶ Start Booking")
        btn_pause = QPushButton("⏸ Pause")
        btn_resume = QPushButton("▶ Resume")
        btn_stop = QPushButton("⏹ Stop Booking")

        btn_start.clicked.connect(self.start_flow)
        btn_pause.clicked.connect(self.pause_flow)
        btn_resume.clicked.connect(self.resume_flow)
        btn_stop.clicked.connect(self.stop_flow)
        btn_machine.clicked.connect(self.show_machine_id)

        center_layout.addWidget(self.status)
        center_layout.addWidget(self.license_label)
        center_layout.addWidget(btn_start)
        center_layout.addWidget(btn_pause)
        center_layout.addWidget(btn_resume)
        center_layout.addWidget(btn_stop)
        center_layout.addWidget(self.logs)
        center_layout.addWidget(btn_machine)

        # ================= RIGHT PANEL =================
        right_panel = QTabWidget()
        right_panel.addTab(CsvEditor(), "Tourist CSV")
        right_panel.addTab(ConfigEditor(), "Config")

        # ================= ASSEMBLE =================
        main_layout.addWidget(left_panel)
        main_layout.addWidget(center_panel, 2)
        main_layout.addWidget(right_panel, 2)
        self.check_license()

    # ================= LOGGING =================
    def log(self, message):
        self.logs.append(message)
        self.logs.ensureCursorVisible()

    # ================= CONTROL =================
    def start_flow(self):
        license_file = app_path("config", "license.key")

        if not os.path.exists(license_file):
            self.log("❌ No license")
            return

        with open(license_file) as f:
            key = f.read().strip()

        if not verify_license(key):
            self.log("❌ Invalid license")
            return
        
        self.status.setText("Status: Running")
        self.log("▶ Automation started")
        start_automation(self.log)

    def pause_flow(self):
        self.status.setText("Status: Paused")
        self.log("⏸ Automation paused")
        pause_automation(self.log)

    def resume_flow(self):
        self.status.setText("Status: Running")
        self.log("▶ Resume requested")
        resume_automation(self.log)

    def stop_flow(self):
        self.status.setText("Status: Stopped")
        self.log("⏹ Automation stopped")
        stop_automation(self.log)

    def show_machine_id(self):
        from security.machine_lock import get_machine_id
        machine_id = get_machine_id()

        QMessageBox.information(
            self,
            "Machine ID",
            f"Send this ID to the vendor for license generation:\n\n{machine_id}"
        )
    
    # ================= LICENSE CHECK ================= 
    def check_license(self): 
        license_file = app_path("config", "license.key") 
        if not os.path.exists(license_file): 
            self.license_label.setText("No license found") 
            return
        
        with open(license_file) as f: 
            key = f.read().strip() 
        
        if not verify_license(key):
            QMessageBox.critical(self, "License Error", "Invalid or tampered license")
            sys.exit()

        info = get_license_info(key)
        
        if not info:
            self.license_label.setText("Invalid license data")
            return
        
        days = info["days_left"] 
        self.license_label.setText(f"License Active ({days} days left)")
        
        if days <= 0: 
            QMessageBox.critical(self, "License Expired", "Your license has expired") 
            sys.exit() 
        
        if days < 10: 
            QMessageBox.warning( self, "License Expiring", f"Your license will expire in {days} days" )

if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = Dashboard()
    win.show()
    sys.exit(app.exec())
