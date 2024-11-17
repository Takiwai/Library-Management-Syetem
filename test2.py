from faker import Faker
import csv

# Initialize Faker instance
fake = Faker()

# Open the output CSV file with context manager for safe file handling
with open('studentdata.CSV', 'w', newline='') as output:
    # Create CSV writer object
    mywriter = csv.writer(output)
    
    # Define the header of the CSV file
    header = ['id', 'name', 'location', 'marks']
    mywriter.writerow(header)
    
    # Write 100 rows of random data
    for _ in range(100):
        # Create a random row for each student
        student_data = [
            fake.random_int(min=100, max=1000),  # Random student ID
            fake.name(),                         # Random student name
            fake.city(),                         # Random student location
            fake.random_int(min=0, max=100)      # Random marks
        ]
        mywriter.writerow(student_data)
