import csv
import os

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFileDialog,
    QHBoxLayout,
    QLabel,
    QMessageBox,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
    QAbstractItemView,
    QHeaderView,
)

from ui.state_helper import app_path


DEFAULT_HEADERS = [
    "name",
    "age",
    "gender",
    "guardian",
    "nationality",
    "idType",
    "idNumber",
]


class CsvEditor(QWidget):
    def __init__(self, file_name="tourists.csv", title="Tourist CSV", helper_text=""):
        super().__init__()
        self.title = title
        self.helper_text = helper_text
        self.default_path = app_path("src", "data", file_name)
        self.current_path = self.default_path

        self.title_label = QLabel(title)
        self.title_label.setObjectName("editorTitle")

        self.helper_label = QLabel(helper_text or "Edit booking rows, validate required fields, then save.")
        self.helper_label.setWordWrap(True)
        self.helper_label.setObjectName("mutedLabel")

        self.path_label = QLabel("")
        self.path_label.setObjectName("pathLabel")

        self.summary_label = QLabel("")
        self.summary_label.setObjectName("summaryLabel")

        self.table = QTableWidget()
        self.table.setAlternatingRowColors(True)
        self.table.setSelectionBehavior(QAbstractItemView.SelectItems)
        self.table.setSelectionMode(QAbstractItemView.SingleSelection)
        self.table.setWordWrap(False)
        self.table.setTextElideMode(Qt.ElideNone)
        self.table.setShowGrid(True)
        self.table.setMinimumHeight(260)
        self.table.verticalHeader().setVisible(False)
        self.table.verticalHeader().setDefaultSectionSize(36)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.horizontalHeader().setMinimumSectionSize(120)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)

        self.btn_open = QPushButton("Open File")
        self.btn_reload = QPushButton("Reload")
        self.btn_add = QPushButton("Add Row")
        self.btn_remove = QPushButton("Remove Row")
        self.btn_validate = QPushButton("Validate")
        self.btn_save = QPushButton("Save")

        self.btn_open.clicked.connect(self.open_csv)
        self.btn_reload.clicked.connect(self.reload_current)
        self.btn_add.clicked.connect(self.add_row)
        self.btn_remove.clicked.connect(self.remove_selected_row)
        self.btn_validate.clicked.connect(self.validate_csv)
        self.btn_save.clicked.connect(self.save_csv)

        action_row = QHBoxLayout()
        action_row.addWidget(self.btn_open)
        action_row.addWidget(self.btn_reload)
        action_row.addStretch(1)
        action_row.addWidget(self.btn_add)
        action_row.addWidget(self.btn_remove)
        action_row.addWidget(self.btn_validate)
        action_row.addWidget(self.btn_save)

        layout = QVBoxLayout()
        layout.addWidget(self.title_label)
        layout.addWidget(self.helper_label)
        layout.addWidget(self.path_label)
        layout.addWidget(self.summary_label)
        layout.addLayout(action_row)
        layout.addWidget(self.table, 1)
        self.setLayout(layout)

        self.ensure_default_file()
        self.load_csv(self.default_path)

    def ensure_default_file(self):
        os.makedirs(os.path.dirname(self.default_path), exist_ok=True)
        if os.path.exists(self.default_path):
            return

        with open(self.default_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(DEFAULT_HEADERS)

    def open_csv(self):
        path, _ = QFileDialog.getOpenFileName(
            self,
            f"Open {self.title}",
            os.path.dirname(self.current_path),
            "CSV Files (*.csv)",
        )
        if path:
            self.load_csv(path)

    def reload_current(self):
        if self.current_path:
            self.load_csv(self.current_path)

    def load_csv(self, path):
        try:
            with open(path, newline="", encoding="utf-8") as f:
                rows = list(csv.reader(f))
        except Exception as exc:
            QMessageBox.critical(self, "Open Failed", f"Could not open CSV:\n{exc}")
            return

        if not rows:
            rows = [DEFAULT_HEADERS]

        headers = rows[0] or DEFAULT_HEADERS
        data_rows = rows[1:]

        self.current_path = path
        self.path_label.setText(f"File: {path}")
        self.table.setColumnCount(len(headers))
        self.table.setHorizontalHeaderLabels(headers)
        self.table.setRowCount(len(data_rows))

        for row_index, row in enumerate(data_rows):
            for col_index in range(len(headers)):
                value = row[col_index] if col_index < len(row) else ""
                self.table.setItem(row_index, col_index, QTableWidgetItem(value))

        self.update_summary()

    def add_row(self):
        row = self.table.rowCount()
        self.table.insertRow(row)
        for col in range(self.table.columnCount()):
            self.table.setItem(row, col, QTableWidgetItem(""))
        self.table.setCurrentCell(row, 0)
        self.update_summary()

    def remove_selected_row(self):
        row = self.table.currentRow()
        if row < 0:
            QMessageBox.information(self, "Remove Row", "Select a row to remove.")
            return
        self.table.removeRow(row)
        self.update_summary()

    def save_csv(self):
        if not self.current_path:
            self.current_path = self.default_path

        if self.table.columnCount() == 0:
            self.table.setColumnCount(len(DEFAULT_HEADERS))
            self.table.setHorizontalHeaderLabels(DEFAULT_HEADERS)

        try:
            with open(self.current_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                headers = [
                    self.table.horizontalHeaderItem(i).text()
                    for i in range(self.table.columnCount())
                ]
                writer.writerow(headers)

                for row in range(self.table.rowCount()):
                    writer.writerow([
                        self._cell_text(row, col)
                        for col in range(self.table.columnCount())
                    ])
        except Exception as exc:
            QMessageBox.critical(self, "Save Failed", f"Could not save CSV:\n{exc}")
            return

        self.update_summary()
        QMessageBox.information(self, "Saved", f"{self.title} saved successfully.")

    def validate_csv(self):
        if self.table.columnCount() == 0:
            QMessageBox.critical(self, "Invalid CSV", "No columns found in this file.")
            return

        headers = [
            self.table.horizontalHeaderItem(i).text().strip()
            for i in range(self.table.columnCount())
        ]
        missing_headers = [header for header in DEFAULT_HEADERS if header not in headers]
        if missing_headers:
            QMessageBox.critical(
                self,
                "Invalid CSV",
                f"Missing required columns: {', '.join(missing_headers)}",
            )
            return

        empty_rows = []
        for row in range(self.table.rowCount()):
            missing_fields = []
            for required_header in DEFAULT_HEADERS:
                col = headers.index(required_header)
                if not self._cell_text(row, col).strip():
                    missing_fields.append(required_header)

            if missing_fields:
                empty_rows.append(f"Row {row + 2}: {', '.join(missing_fields)}")

        if empty_rows:
            QMessageBox.warning(
                self,
                "Validation Warning",
                "Some rows are incomplete:\n\n" + "\n".join(empty_rows[:12]),
            )
        else:
            QMessageBox.information(
                self,
                "Validation Passed",
                f"{self.table.rowCount()} row(s) are ready in {self.title}.",
            )

        self.update_summary()

    def update_summary(self):
        self.summary_label.setText(
            f"Rows: {self.table.rowCount()}   Columns: {self.table.columnCount()}"
        )

    def _cell_text(self, row, col):
        item = self.table.item(row, col)
        return item.text() if item else ""
