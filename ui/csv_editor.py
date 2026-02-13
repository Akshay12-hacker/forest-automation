from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QPushButton,
    QTableWidget, QTableWidgetItem, QFileDialog, QMessageBox
)
import csv
import os

class CsvEditor(QWidget):
    def __init__(self):
        super().__init__()
        self.layout = QVBoxLayout()
        self.table = QTableWidget()

        self.btn_load = QPushButton("Load CSV")
        self.btn_save = QPushButton("Save CSV")
        self.btn_validate = QPushButton("Validate")

        self.btn_load.clicked.connect(self.load_csv)
        self.btn_save.clicked.connect(self.save_csv)
        self.btn_validate.clicked.connect(self.validate_csv)

        self.layout.addWidget(self.btn_load)
        self.layout.addWidget(self.table)
        self.layout.addWidget(self.btn_validate)
        self.layout.addWidget(self.btn_save)

        self.setLayout(self.layout)
        self.current_path = None

    def load_csv(self):
        path, _ = QFileDialog.getOpenFileName(
            self, "Open CSV", "src/data", "CSV Files (*.csv)"
        )
        if not path:
            return

        self.current_path = path

        with open(path, newline='', encoding='utf-8') as f:
            reader = list(csv.reader(f))

        self.table.setRowCount(len(reader) - 1)
        self.table.setColumnCount(len(reader[0]))
        self.table.setHorizontalHeaderLabels(reader[0])

        for r, row in enumerate(reader[1:]):
            for c, val in enumerate(row):
                self.table.setItem(r, c, QTableWidgetItem(val))

    def save_csv(self):
        if not self.current_path:
            return

        with open(self.current_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            headers = [
                self.table.horizontalHeaderItem(i).text()
                for i in range(self.table.columnCount())
            ]
            writer.writerow(headers)

            for r in range(self.table.rowCount()):
                writer.writerow([
                    self.table.item(r, c).text()
                    for c in range(self.table.columnCount())
                ])

        QMessageBox.information(self, "Saved", "CSV saved successfully")

    def validate_csv(self):
        required = {"name", "age", "gender", "guardian", "nationality", "idType", "idNumber"}
        headers = {
            self.table.horizontalHeaderItem(i).text()
            for i in range(self.table.columnCount())
        }

        missing = required - headers
        if missing:
            QMessageBox.critical(
                self, "Invalid CSV",
                f"Missing columns: {', '.join(missing)}"
            )
        else:
            QMessageBox.information(self, "Valid", "CSV structure OK")
