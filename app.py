from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='yumzy', static_url_path='')
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:12345@localhost:12345/yumzy'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


db = SQLAlchemy(app)

class User(db.Model):
    __tablename__ = 'users'
    id       = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)

class Order(db.Model):
    __tablename__ = 'orders'
    id      = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)
    total   = db.Column(db.Integer)
    address = db.Column(db.String(200))
    status  = db.Column(db.String(50), default='Preparing')

class Feedback(db.Model):
    __tablename__ = 'feedback'
    id      = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)
    rating  = db.Column(db.String(10))
    comment = db.Column(db.Text)

with app.app_context():
    try:
        db.create_all()
        print("All tables ready")
    except Exception as e:
        print("DB ERROR:", e)

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data     = request.get_json(force=True) or {}
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify(error='Fill all fields.'), 400
        if len(password) < 4:
            return jsonify(error='Password must be at least 4 characters.'), 400
        if User.query.filter_by(username=username).first():
            return jsonify(error='Username already exists. Please login.'), 400

        user = User(username=username, password=password)
        db.session.add(user)
        db.session.commit()

        return jsonify(message=f'Account created! Welcome, {username}!'), 201

    except Exception as e:
        print("REGISTER ERROR:", e)
        return jsonify(error='Server error'), 500


@app.route('/api/login', methods=['POST'])
def login():
    try:
        data     = request.get_json(force=True) or {}
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify(error='Enter username and password.'), 400

        user = User.query.filter(
            db.func.lower(User.username) == username.lower()
        ).first()

        if not user:
            return jsonify(error='Account not found. Please register.'), 400
        if user.password != password:
            return jsonify(error='Incorrect password.'), 400

        return jsonify(message=f'Welcome back, {username}!', userId=user.id), 200

    except Exception as e:
        print("LOGIN ERROR:", e)
        return jsonify(error='Server error'), 500

@app.route('/api/order', methods=['POST'])
def place_order():
    try:
        data  = request.get_json(force=True) or {}
        order = Order(
            user_id=data.get('userId'),
            total=data.get('total'),
            address=data.get('address'),
            status='Preparing'
        )
        db.session.add(order)
        db.session.commit()

        return jsonify(message='Order placed!', orderId=order.id), 201

    except Exception as e:
        print("ORDER ERROR:", e)
        return jsonify(error='Server error'), 500

@app.route('/api/feedback', methods=['POST'])
def save_feedback():
    try:
        data = request.get_json(force=True) or {}
        fb   = Feedback(
            user_id=data.get('userId'),
            rating=data.get('rating'),
            comment=data.get('comment')
        )
        db.session.add(fb)
        db.session.commit()

        return jsonify(message='Feedback saved!'), 201

    except Exception as e:
        print("FEEDBACK ERROR:", e)
        return jsonify(error='Server error'), 500


@app.route('/api/health')
def health():
    try:
        db.session.execute(db.text('SELECT 1'))
        return jsonify(status='ok', db='connected'), 200
    except Exception as e:
        return jsonify(status='error', db=str(e)), 500


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def static_files(path):
    if path.startswith('api/'):
        return jsonify(error='Not found'), 404
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)