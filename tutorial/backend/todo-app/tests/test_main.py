from fastapi.testclient import TestClient #provides a way to test FastAPI endpoint
from fastapi import FastAPI 
from todo_app import setting 
from sqlmodel import SQLModel, create_engine, Session
from todo_app.main import app, get_session
import pytest


connection_string: str = str(setting.TEST_DATABASE_URL).replace(
    "postgresql", "postgresql+psycopg")
#retrieves and modifies the test database url to be compaitable with psycopg2

engine = create_engine(connection_string, connect_args={
                       "sslmode": "require"}, pool_recycle=300, pool_size=10, echo=True)
#create a database engine using the test database URL with specific connection arguments and settings

#========================================================================================
# Refactor with pytest fixture
# We can make code reusable using fixture
# 1- Arrange, 2-Act, 3-Assert 4- Cleanup

# In arrange, set up the neceesary pre-conditions and inputs
# Act: perform the action or invoke the method being tested
# Verify that the action produced the expected result
# Cleanup: perform any necessary cleanup after the test is complete. reset any state or resources used in test
#=======================================================================================

#this fixture will be initiated before first test and cleanup after all test. There will be only one fixture for all test. This is done after scope is declare module. autouse true will automatically call the fixture for all the test
@pytest.fixture(scope="module", autouse=True)
def get_db_session(): #a pytest fixture that set ups the database session for the tests. It creates the necessary tables before yielding the session
    SQLModel.metadata.create_all(engine)
    yield Session(engine)


@pytest.fixture(scope='function')
def test_app(get_db_session): #a pytest that overrides the get_session dependency to use the get_db_session fixtures. It creates a TestClient for testting the fastapi app
    def test_session():
        yield get_db_session
    app.dependency_overrides[get_session] = test_session
    with TestClient(app=app) as client:
        yield client

#=========================================================================================


# Test-1: root test
def test_root():
    client = TestClient(app=app) #create a TestClient for testing the fastapi app
    response = client.get('/') #send a get request to the root endpoint
    data = response.json() #get the response data as json
    assert response.status_code == 200 #Verify that the response status code is 200 and the returned message is correct
    assert data == {"message": "Welcome to dailyDo todo app"}

# Test-2 post test
def test_create_todo(test_app):
    test_todo = {"content":"create todo test", "is_completed":False} #create a todo item
    response = test_app.post('/todos/',json=test_todo) #send a post request to create the todo item
    data = response.json() #get the response data as json

    assert response.status_code == 200 #verify that the response status is 200 and the content matches the test todo item
    assert data["content"] == test_todo["content"]

# Test-3 : get_all todos item
def test_get_all(test_app):
    test_todo = {"content":"get all todos test", "is_completed":False} #create a todo item
    response = test_app.post('/todos/',json=test_todo)
    data = response.json() #send a post request to the create todo item a

    response = test_app.get('/todos/')#Send a GET request to retrieve all todos
    new_todo = response.json()[-1] 
    assert response.status_code == 200 #Verify that the response status is 200 and the last todo item matches the test todo item
    assert new_todo["content"] == test_todo["content"]


# Test-4 Sinlge todo endpoint
def test_get_single_todo(test_app):

    test_todo = {"content":"get single todo test", "is_completed":False} #create a todo item 
    response = test_app.post('/todos/',json=test_todo) #make a post request to post the todo item
    todo_id = response.json()["id"] #retrieve the todo item posted id

    res = test_app.get(f'/todos/{todo_id}') #send a post reques to retrieve the specific todo item by id
    data = res.json() #get the response data as json

    assert res.status_code == 200 #verify the response status is 200 and the content matches the test todo item
    assert data["content"] == test_todo["content"]

# Test-5 : Edit Todo endoint
def test_edit_todo(test_app):

    test_todo = {"content":"edit todo test", "is_completed":False} #create a todo item
    response = test_app.post('/todos/',json=test_todo) #post the todo item
    todo_id = response.json()["id"] #retireve the todo item posted id from the json

    edited_todo = {"content":"We have edited this", "is_completed":False} #create another task
    response = test_app.put(f'/todos/{todo_id}',json=edited_todo) #send a put request to edit the specific todo item
    data = response.json()
    assert response.status_code == 200 #verify that the response status is 200 and the content matches the edited todo item
    assert data["content"] == edited_todo["content"]


# Test-6 Delete todo endpoint
def test_delete_todo(test_app):

    test_todo = {"content":"delete todo test", "is_completed":False} #create a todo item
    response = test_app.post('/todos/',json=test_todo) #post the todo item
    todo_id = response.json()["id"]#retrieve the todo item posted id from the json

    response = test_app.delete(f'/todos/{todo_id}')#make a delete request to delete the todo item with that specific id
    data = response.json()
    assert response.status_code == 200 #verify that the response status is 200 and the success message is returned
    assert data["message"] == "Task successfully deleted"