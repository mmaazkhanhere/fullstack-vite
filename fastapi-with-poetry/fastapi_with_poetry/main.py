from fastapi import FastAPI

app = FastAPI() #initialise FastAPI using variable 'app' (it can be anything)

@app.get('/')
def read_root():
    return {"Hello": "world"}

@app.get('/city')
def city():
    return {"City": "Peshawar"}