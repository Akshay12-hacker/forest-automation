from security.license_manager import generate_license

machine_id = input("Enter Machine ID: ")

license_key = generate_license(machine_id, days=365)

print("\n=== LICENSE KEY ===\n")
print(license_key)