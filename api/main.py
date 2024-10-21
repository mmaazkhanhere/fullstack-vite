from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum  # Adapter for AWS Lambda (used by Vercel)

app = FastAPI()

# CORS configuration to allow requests from your frontend
origins = [
    "https://your-project.vercel.app",  # Replace with your actual Vercel domain
    "http://localhost:3000",            # For local development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/hello")
def read_root():
    return {"message": "Hello from FastAPI!"}

# Handler for Vercel serverless function
handler = Mangum(app)
