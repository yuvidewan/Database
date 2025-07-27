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
def show_tables_structure(username,password,db_name):
    # This endpoint now only gets the table structure (columns and total rows)
    # The initial row data will be fetched by a separate call from the frontend.
    try:
        obj = pymysql.connect(host="localhost", user=username, password=password, database=db_name)
        cur = obj.cursor()
    except Exception as e:
        raise HTTPException(status_code=401, detail="Database connection failed.")
    
    cur.execute("SHOW TABLES")
    tb_list_tuples = cur.fetchall()
    tb_list = [item[0] for item in tb_list_tuples]

    table_block = {}
    for table_name in tb_list: 
        # Get column names
        cur.execute(f"DESCRIBE {table_name}")
        desc = cur.fetchall()
        column_names = [j[0] for j in desc]
        
        # Get total row count for pagination
        cur.execute(f"SELECT COUNT(*) FROM {table_name}")
        total_rows = cur.fetchone()[0]

        table_block[table_name] = {
            "columns": column_names,
            "total_rows": total_rows,
            "rows": [] # Rows will be fetched on demand by the frontend
        }
    
    obj.close()
    return JSONResponse(status_code=200, content=table_block)

@router.get("/get-page")
def get_page_data(username: str, password: str, db_name: str, table_name: str, page: int = 1, limit: int = 50):
    try:
        obj = pymysql.connect(host="localhost", user=username, password=password, database=db_name)
        cur = obj.cursor()
        
        offset = (page - 1) * limit
        
        # Get column names first to use in format_data
        cur.execute(f"DESCRIBE `{table_name}`")
        desc = cur.fetchall()
        column_names = [j[0] for j in desc]

        query = f"SELECT * FROM `{table_name}` LIMIT %s OFFSET %s"
        cur.execute(query, (limit, offset))
        data_list = cur.fetchall()
        
        obj.close()
        
        formatted_data = format_data(data_list=data_list, column_names=column_names)
        return JSONResponse(status_code=200, content={"rows": formatted_data})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while fetching page data: {e}")

