import mysql.connector as pymysql

def create_connection(username,password):
    try:
        obj = pymysql.connect(host = "localhost",user = username,password = password)
        return obj
    except Exception as e:
        return None