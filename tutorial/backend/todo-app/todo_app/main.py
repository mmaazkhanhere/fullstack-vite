from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import SQLModel, Field, create_engine, Session, select
from todo_app import setting
from typing import Annotated
from contextlib import asynccontextmanager

# Step-1: Create Database on Neon
# Step-2: Create .env file for environment variables
# Step-3: Create setting.py file for encrypting DatabaseURL
# Step-4: Create a Model
# Step-5: Create Engine
# Step-6: Create function for table creation
# Step-7: Create function for session management
# Step-8: Create contex manager for app lifespan
# Step-9: Create all endpoints of todo app


# define the structure of the data that will be stored in the database. The model uses
# SQLModel, which combines SQLAlchemy and Pydantic
class Todo (SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True) # id is the primary key
    content: str = Field(index=True, min_length=3, max_length=54)# content of the task
    is_completed: bool = Field(default=False) #boolean field to indicate if the task is completed


# engine is one for whole application. engine is responsible for managing the conntection to the database. The connection is modified to use 'psycopg2', which is a PostgreSQL adapter for python
connection_string: str = str(setting.DATABASE_URL).replace(
    "postgresql", "postgresql+psycopg")
engine = create_engine(connection_string, connect_args={
                       "sslmode": "require"}, pool_recycle=300, pool_size=10, echo=True)

#sslmode=require ensures SSL connection. Secure Socket Layer
#pool_recycle and pool_size are for connection pooling
#echo=True enables SQL query logging


#function creates the tables defined in the models
def create_tables():
    SQLModel.metadata.create_all(engine) #create all tables in the database

#function for session management. Sessions are used to interact with the database. This function provides a session scope for each request
def get_session():
    with Session(engine) as session:
        yield session #provide a session to the caller


#create context manager foe app life space. The context manager handles tasks that need to be executed before and after the app's lifespan, such as table creation
@asynccontextmanager
async def lifespan(app: FastAPI):
    print('Creating Tables')
    create_tables()
    print("Tables Created")
    yield


#defines the FastAPI app and all the necessary endpoints for the Todo application
app: FastAPI = FastAPI(
    lifespan=lifespan, title="Todo App", version='1.0.0')


#at root endpoint returns a welcome message
@app.get('/')
async def root():
    return {"message": "Welcome to dailyDo todo app"}


#endpoint to create a new todo item
#Dependency Injection: Depends(get_session) tells FastAPI to call the get_session function and use its return value as the value for session.
@app.post('/todos/', response_model=Todo)
async def create_todo(todo: Todo, session: Annotated[Session, Depends(get_session)]):
    session.add(todo) # add the new todo to the session
    session.commit() #commit the transaction to save the todo to the database
    session.refresh(todo) #refresh the todo to get updated data from the database
    return todo #return the created todo item

#returns the list of todos
@app.get('/todos/', response_model=list[Todo])
async def get_all(session: Annotated[Session, Depends(get_session)]):
    todos = session.exec(select(Todo)).all() #execute a query to select all todos
    if todos:
        return todos #return todos
    else:
        raise HTTPException(status_code=404, detail="No Task found") #raise an exception


#returns a specific todo item by id
@app.get('/todos/{id}', response_model=Todo)
async def get_single_todo(id: int, session: Annotated[Session, Depends(get_session)]):
    todo = session.exec(select(Todo).where(Todo.id == id)).first() #query the database for the todo item with the given id
    if todo: #return todo
        return todo
    else:
        raise HTTPException(status_code=404, detail="No Task found")


#returns an updated existing todo item
@app.put('/todos/{id}')
async def edit_todo(id: int, todo: Todo, session: Annotated[Session, Depends(get_session)]):
    existing_todo = session.exec(select(Todo).where(Todo.id == id)).first() #query the database to find the item
    if existing_todo:
        existing_todo.content = todo.content #update the conten of the existing todo
        existing_todo.is_completed = todo.is_completed #update the is_completed field of the existing todo
        session.add(existing_todo) #add the updated todo to the session
        session.commit()#commit the transaction to save the updated todo to the database
        session.refresh(existing_todo)#refresh the todo to get updated data from the database
        return existing_todo
    else:
        raise HTTPException(status_code=404, detail="No task found")


#deletes a specific todo item by id
@app.delete('/todos/{id}')
async def delete_todo(id: int, session: Annotated[Session, Depends(get_session)]):
    todo = session.exec(select(Todo).where(Todo.id == id)).first()  # Query the database for the Todo to be deleted
    if todo:
        session.delete(todo)  # Delete the Todo from the session
        session.commit()  # Commit the transaction to remove the Todo from the database
        return {"message": "Task successfully deleted"}  # Return a success message
    else:
        raise HTTPException(status_code=404, detail="No task found")  # Raise an exception if the Todo is not found
