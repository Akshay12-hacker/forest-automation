from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget,
    QVBoxLayout, QPushButton, QLabel, QTextEdit
)
import sys
from ui.automation_controller import (
    start_automation,
    stop_automation,
    pause_automation,
    resume_automation
)
from PySide6.QtWidgets import QComboBox

class Dashboard(QMainWindow):
    def __init__(self):
        super().__init__()
        self.phase_select = QComboBox()
        self.phase_select.addItems([
        "ZONE_SELECT",
        "PHASE_8_FULL",
        "PHASE_8_SINGLE",
        "OTP",
        "PAYMENT"
        ])
        self.setWindowTitle("Forest Automation - Officer Dashboard")
        self.setGeometry(300, 100, 900, 600)

        central = QWidget()
        layout = QVBoxLayout()

        self.status = QLabel("Status: Idle")
        self.logs = QTextEdit()
        self.logs.setReadOnly(True)

        btn_start = QPushButton("▶ Start Booking")
        btn_pause = QPushButton("⏸ Pause")
        btn_resume = QPushButton("▶ Resume")
        btn_stop = QPushButton("⏹ Stop Booking")

        btn_start.clicked.connect(self.start_flow)
        btn_pause.clicked.connect(self.pause_flow)
        btn_resume.clicked.connect(self.resume_flow)
        btn_stop.clicked.connect(self.stop_flow)

        layout.addWidget(self.status)
        layout.addWidget(btn_start)
        layout.addWidget(btn_pause)
        layout.addWidget(QLabel("Resume From Phase:"))
        layout.addWidget(self.phase_select)
        layout.addWidget(btn_stop)
        layout.addWidget(self.logs)

        central.setLayout(layout)
        self.setCentralWidget(central)

    def log(self, message):
        self.logs.append(message)
        self.logs.ensureCursorVisible()

    def start_flow(self):
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

if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = Dashboard()
    win.show()
    sys.exit(app.exec())
