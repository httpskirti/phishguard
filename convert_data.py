import pandas as pd
from scipy.io import arff
import os

data, meta = arff.loadarff("uci_data/Training Dataset.arff")
df = pd.DataFrame(data)

for col in df.columns:
    df[col] = df[col].apply(lambda x: int(x.decode("utf-8") if isinstance(x, bytes) else x))

print("Dataset Shape:", df.shape)
print("Columns count:", len(df.columns))
print("Sample columns:", df.columns.tolist()[:5])

# Save as phisingData.csv
df.to_csv("phisingData.csv", index=False)
print("Saved phisingData.csv with", len(df), "records.")
