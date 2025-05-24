import functions_framework
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from app import app as flask_app

# Register HTTP function with Functions Framework
@functions_framework.http
def touchgrass_api(request):
    """HTTP Cloud Function.
    Args:
        request (flask.Request): The request object.
    Returns:
        The response text, or any set of values that can be turned into a
        Response object using `make_response`.
    """
    # Use the Flask app to handle the request
    with flask_app.request_context(request.environ):
        return flask_app.full_dispatch_request()

# For local development
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    flask_app.run(host='0.0.0.0', port=port, debug=True) 