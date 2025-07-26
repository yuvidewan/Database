from fastapi import APIRouter,HTTPException
from fastapi.responses import JSONResponse
import mysql.connector as pymysql
import decimal
import datetime

router =  APIRouter(
    prefix = "/connection",
    tags = ["Connection Management"],
    responses = {404:{"message": "not found"}}
)

@router.get("/test")
def create_connection(username,password):
    #print(username,password)
    try:
        obj = pymysql.connect(
            host = "localhost",
            user = username,
            password = password
        )
        cur = obj.cursor()
    except Exception as e:
        raise HTTPException(
            status_code=401
        )
    return JSONResponse(
        status_code=200,
        content={"message": "Connection successful"} # Add any content you want
    )

@router.get("/showdb")
def show_database(username,password):
    #print(username,password)
    try:
        obj = pymysql.connect(
            host = "localhost",
            user = username,
            password = password
        )
        cur = obj.cursor()
    except Exception as e:
        raise HTTPException(
            status_code=401
        )

    cur.execute("show databases")
    db_list = cur.fetchall()
    #print(db_list)
    return JSONResponse(
        status_code=200,
        content = db_list
    )

def format_data(data_list,column_names):
    l = []
    for i in data_list:
        d = {}
        for j in range(len(i)):
            # print(f"{column_names[j]} = {i[j]}")
            value = i[j]
            # Check if the value is a Decimal and convert it to a string
            if isinstance(value, decimal.Decimal):
                d[column_names[j]] = str(value)
            # Check if the value is a datetime object and convert it to a string
            elif isinstance(value, datetime.datetime) or isinstance(value, datetime.date):
                d[column_names[j]] = value.isoformat()
            else:
                d[column_names[j]] = value
        l.append(d)
    return l

@router.get("/showtb")
def show_tables(username,password,db_name):
    # {
    # "products": {
    #     "columns": ["id", "name", "price"],
    #     "rows": [
    #     { "id": 1, "name": "Quantum Laptop", "price": 1499.99 },
    #     { "id": 2, "name": "Ergo-Flow Keyboard", "price": 89.50 }
    #     ]
    # },
    # "customers": {
    #     "columns": ["customer_id", "first_name", "email"],
    #     "rows": [
    #     { "customer_id": 101, "first_name": "Alice", "email": "alice@example.com" },
    #     { "customer_id": 102, "first_name": "Bob", "email": "bob@example.com" }
    #     ]
    # },
    # "orders": {
    #     "columns": ["order_id", "customer_id", "order_date", "total"],
    #     "rows": [
    #     { "order_id": 5001, "customer_id": 101, "order_date": "2025-07-26", "total": 1499.99 },
    #     { "order_id": 5002, "customer_id": 101, "order_date": "2025-07-26", "total": 89.50 }
    #     ]
    # }
    # }
    try:
        obj = pymysql.connect(
            host = "localhost",
            user = username,
            password = password,
            database = db_name
        )
        cur = obj.cursor()
    except Exception as e:
        raise HTTPException(
            status_code=401
        )
    cur.execute("show tables")
    tb_list = cur.fetchall()
    
    for i in range(len(tb_list)):
        tb_list[i] = tb_list[i][0]


    table_block = {}
    for i in tb_list: 
        cur.execute(f"describe {i}")
        desc = cur.fetchall()
        column_names = []
        for j in desc:
            column_names.append(j[0])
        # print(i,column_names)
        # print("----------------")


        local_dict = {}
        local_dict["columns"] = column_names


        cur.execute(f"select * from {i}")
        data_list = cur.fetchall()
        # This now calls the corrected format_data function
        formatted_data = format_data(data_list = data_list, column_names = column_names)
        # for i in formatted_data:
        #     print(i)
        #     print("-------------")
        local_dict["rows"] = formatted_data

        table_block[i] = local_dict

    # IMPORTANT: The return statement should be outside the loop
    return JSONResponse(
        status_code=200,
        content=table_block
    )
        
    
    # for i in table_block:
    #     print(i," - ",table_block[i])
    #     print("------------------")

