import pandas as pd

metadata = pd.read_parquet("corpus/_metadata_temp.parquet", engine="fastparquet")
print("Columns:", list(metadata.columns))
print("\nFirst row:")
print(metadata.iloc[0])
print("\nSample of 'available_languages' column (first 10 values):")
print(metadata["available_languages"].head(10).tolist())
