# ICT-License-Tracker



run init
//to add install the packages
python3 -m pip install -r requirements.txt

//to run the dev application
gunicorn -w 4 -b 0.0.0.0:10000 app:app