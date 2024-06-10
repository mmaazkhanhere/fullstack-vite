from fastapi import FastAPI

app: FastAPI = FastAPI();

@app.get('/')
async def root():
    return {"message": "Hello World"}

@app.get('/todo/')
async def read_todos():
    return {
        "content": "learn fast api"
    }