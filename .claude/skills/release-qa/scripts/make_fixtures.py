#!/usr/bin/env python3
"""Create the SQLite test database + CSV fixtures used by the QA script.   make_fixtures.py <out dir>"""
import json, os, sqlite3, sys
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
p = os.path.join(out, "qa.db")
if os.path.exists(p): os.remove(p)
c = sqlite3.connect(p)
c.executescript("""
CREATE TABLE departments(id INTEGER PRIMARY KEY, name TEXT NOT NULL, budget REAL);
CREATE TABLE employees(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, dept_id INTEGER REFERENCES departments(id),
  salary REAL, hired_on DATE, active BOOLEAN DEFAULT 1, profile JSON);
INSERT INTO departments VALUES (1,'Engineering',500000),(2,'Sales',300000),(3,'Support',150000);
""")
rows = [("Ada Lovelace",1,125000,"2020-01-15",1,{"skills":["math","analysis"],"address":{"city":"London","zip":"EC1"},"level":7}),
        ("Grace Hopper",1,135000,"2019-06-01",1,{"skills":["compilers"],"address":{"city":"New York","zip":"10001"},"level":9}),
        ("Alan Turing",1,130000,"2021-03-22",1,{"skills":["crypto","logic"],"address":{"city":"Manchester"},"level":8}),
        ("Don Draper",2,90000,"2018-09-10",1,{"skills":["pitching"],"address":{"city":"NYC"},"level":5}),
        ("Peggy Olson",2,85000,"2019-02-11",0,{"skills":["copywriting"],"level":4}),
        ("Roy Kent",3,60000,"2022-07-04",1,None)]
for r in rows:
    c.execute("INSERT INTO employees(name,dept_id,salary,hired_on,active,profile) VALUES (?,?,?,?,?,?)",
              (*r[:5], json.dumps(r[5]) if r[5] is not None else None))
# scratch tables for structure-editor tests (rename/add/drop): create one per attempt, they get modified
for n in ("struct_a", "struct_b", "struct_c"):
    c.execute(f"CREATE TABLE {n} (id integer primary key autoincrement, title varchar(255), budget real)")
    c.execute(f"INSERT INTO {n}(title,budget) VALUES ('x',1),('y',2)")
c.commit(); c.close()
open(os.path.join(out, "new_people.csv"), "w").write('id,name,city,age,joined\n1,Ann,Paris,31,2023-01-05\n2,Bob,Berlin,45,2022-11-30\n3,Cleo,"Rome, IT",28,2024-02-14\n4,Dan,Oslo,52,2021-08-19\n')
open(os.path.join(out, "more_people.csv"), "w").write('id,name,city,age,joined\n5,Eve,Madrid,39,2023-05-05\n6,Finn,Dublin,24,2024-04-01\n')
print("fixtures in", out)
