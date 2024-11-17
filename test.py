import requests
import pandas as pd
import sqlite3
from sqlalchemy import create_engine

# Extract function
def extract() -> dict:
    """Extract data from the API"""
    API_URL = "http://universities.hipolabs.com/search?country=United+States"
    try:
        response = requests.get(API_URL)
        response.raise_for_status()  # Check if request was successful
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error occurred while fetching data: {e}")
        return []  # Return an empty list if the API call fails

# Transform function
def transform(data: dict) -> pd.DataFrame:
    """Transforms the dataset into desired structure and filters."""
    df = pd.DataFrame(data)
    print(f"Total Number of universities from API: {len(data)}")

    # Filter for universities in California
    df = df[df["name"].str.contains("California", case=False, na=False)]  # added case insensitive matching
    print(f"Number of universities in California: {len(df)}")

    # Concatenate list items into a comma-separated string
    df['domains'] = df['domains'].apply(lambda x: ','.join(map(str, x)) if isinstance(x, list) else '')
    df['web_pages'] = df['web_pages'].apply(lambda x: ','.join(map(str, x)) if isinstance(x, list) else '')

    df = df.reset_index(drop=True)

    # Select relevant columns for final DataFrame
    return df[["domains", "country", "web_pages", "name"]]

# Load function using sqlite3 connection
def load(df: pd.DataFrame) -> None:
    """Loads data into an SQLite database using sqlite3 connection"""
    try:
        # Create SQLite engine for SQLAlchemy (just for engine creation)
        disk_engine = create_engine('sqlite:///my_lite_store.db')
        
        # Connect to SQLite using sqlite3 (native connection)
        with sqlite3.connect('my_lite_store.db') as conn:
            # Load DataFrame into SQL table (replace if table exists)
            df.to_sql('cal_uni', conn, if_exists='replace', index=False)
        
        print(f"Data successfully loaded into SQLite database.")
    except Exception as e:
        print(f"Error occurred while loading data: {e}")

# Main task orchestrator
def main_task():
    """Main ETL task: extract, transform, load"""
    data = extract()
    if data:  # Proceed only if data extraction was successful
        df = transform(data)
        load(df)
    else:
        print("No data to process.")

# Run the ETL pipeline
if __name__ == "__main__":
    main_task()
