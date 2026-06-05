from flask import Flask, send_from_directory

app = Flask(__name__, static_folder='.')

@app.route("/")
@app.route("/<path:filename>")
def serve_static_files(filename="index.html"):
    return send_from_directory(".", filename)

app.run(
    host="0.0.0.0",
    port=4443,
    ssl_context=("keys/localhost.pem","keys/localhost-key.pem"),
)
