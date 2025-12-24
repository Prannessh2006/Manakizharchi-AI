import os
import io
import base64
import re
import string
import json
import emoji
import chromadb
import instaloader
import nltk
import seaborn as sns
import matplotlib
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from sentence_transformers import SentenceTransformer
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk import pos_tag
from langchain_groq import ChatGroq
import google.generativeai as genai

matplotlib.use('Agg')


gemini_model = genai.GenerativeModel("gemini-2.5-flash")

genai.configure(api_key="API_KEY")

LLM = ChatGroq(groq_api_key = "API_KEY",model="meta-llama/llama-4-scout-17b-16e-instruct")

try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
    nltk.data.find('taggers/averaged_perceptron_tagger')
    nltk.data.find('corpora/wordnet')
except nltk.downloader.DownloadError:
    print("Downloading necessary NLTK data...")
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True)
    nltk.download('wordnet', quiet=True)

analyzer = SentimentIntensityAnalyzer()
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words("english"))
encoding_model = SentenceTransformer('all-MiniLM-L6-v2')

def get_wordnet_pos(pos):
    if pos.startswith('J'):
        return "a"
    elif pos.startswith('V'):
        return "v"
    elif pos.startswith('N'):
        return "n"
    elif pos.startswith('R'):
        return "r"
    else:
        return "n"

def analyze_text_sentiment(text):
    tokens = nltk.word_tokenize(text.lower())
    tokens = [t for t in tokens if t.isalpha() and t not in stop_words]
    pos_tags = nltk.pos_tag(tokens)
    lemmatized_tokens = [lemmatizer.lemmatize(word, get_wordnet_pos(pos)) for word, pos in pos_tags]
    processed_text = ' '.join(lemmatized_tokens)
    scores = analyzer.polarity_scores(processed_text)
    return {
        "neutral": f"{scores['neu'] * 100:.2f}%",
        "positive": f"{scores['pos'] * 100:.2f}%",
        "negative": f"{scores['neg'] * 100:.2f}%",
        "compound": scores['compound']
    }

def create_sentiment_plot(scores):
    sns.set_theme(style="whitegrid")
    fig, ax = plt.subplots(figsize=(8, 4))
    categories = ['Positive', 'Neutral', 'Negative']
    values = [float(scores['positive'].strip('%')), float(scores['neutral'].strip('%')), float(scores['negative'].strip('%'))]
    colors = ['#4caf50', '#ff9800', '#f44336']
    bars = ax.bar(categories, values, color=colors)
    ax.set_ylabel('Percentage (%)')
    ax.set_title('Sentiment Analysis Score Breakdown')
    ax.set_ylim(0, 100)
    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 1, f'{yval:.1f}%', ha='center', va='bottom')
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def analyze_insta_post(session_id, username, password, post_url):
    try:
        client = instaloader.Instaloader()
        if session_id:
            client.load_session_from_file(username, session_id)
        elif username and password:
            client.login(username, password)
        else:
            return {"error": "Authentication details are missing."}

        media_pk = client.media_pk_from_url(post_url)
        comments = client.media_comments(media_pk, amount=100)
        info = client.media_info(media_pk)
        caption = info.caption_text or "No caption available."

        original_comments = []
        cleaned_comments = []
        for comment in comments:
            original_text = comment.text
            original_comments.append(original_text)
            cleaned_text = ' '.join([emoji.demojize(char).strip(":").replace("_", " ") if char in emoji.EMOJI_DATA else char for char in original_text])
            cleaned_comments.append(cleaned_text.strip())

        if not cleaned_comments:
            return {"error": "No comments found to analyze."}

        prompt = f"""Given a list of Instagram comments {cleaned_comments}, generate a set of interpreted statements that reflect the literal meaning or intent behind each original comment. Do not summarize the comments and do not modify their core meaning. Instead, rewrite each comment into a clear, explicit sentence expressing what the commenter intended.
Examples:
• “GOAT” should be rewritten as “The commenter is saying this person is the greatest of all time.”
• “Fire content” becomes “The commenter thinks the content is extremely good.”

Produce exactly {len(cleaned_comments)} sentences, one for each comment, and end every sentence with a period.

The output should be a direct collection of interpreted meanings suitable for sentiment analysis. Keep the interpretations simple, literal, and aligned with the intent behind each comment."""
        
        refined_text = gemini_model.generate_content(prompt).text.strip()
        refined_comments = [s.strip() for s in refined_text.split('.') if s.strip()]

        sentiment_scores = [analyzer.polarity_scores(c)['compound'] for c in refined_comments]
        avg_compound_score = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0

        prompt = f"""Analyze the emotional response of an Instagram audience using two inputs:
The post description: {caption}
The average sentiment compound score: {avg_compound_score} ranging from -1 to 1

Classify the audience into one or more of the following categories and interpret what each means in relation to the content:
• Curious, Understanding, Accepting, Excited, Neutral or indifferent, Confused or doubtful, Frustrated, Frightened or worried, Sad

Based on the post description and the sentiment score, provide:
1. The most fitting emotional category (or categories)
2. A brief explanation linking both the content context and the sentiment score to the emotional interpretation

Keep the response concise, direct, and context-driven."""
        
        interpretation = llm.invoke(prompt).content.strip()

        plot_img = create_sentiment_distribution_plot(sentiment_scores)

        return {
            "caption": caption,
            "avg_compound_score": avg_compound_score,
            "interpretation": interpretation,
            "plot": plot_img
        }

    except Exception as e:
        return {"error": str(e)}

def create_sentiment_distribution_plot(scores):
    sns.set_theme(style="whitegrid")
    fig, ax = plt.subplots(figsize=(10, 6))
    sns.histplot(scores, bins=20, kde=True, color='skyblue', ax=ax)
    ax.axvline(sum(scores)/len(scores), color='red', linestyle='--', label=f"Average Score: {sum(scores)/len(scores):.2f}")
    ax.set_title('Distribution of Comment Sentiment Scores')
    ax.set_xlabel('Compound Sentiment Score')
    ax.set_ylabel('Number of Comments')
    ax.legend()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

class MyHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.serve_file('index.html', 'text/html')
        elif self.path == '/style.css':
            self.serve_file('style.css', 'text/css')
        elif self.path == '/script.js':
            self.serve_file('script.js', 'application/javascript')
        else:
            self.send_error(404)

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))

        if self.path == '/api/text-analysis':
            text = data.get('text', '')
            if not text:
                self.send_json_response(400, {"error": "Text is required"})
                return
            scores = analyze_text_sentiment(text)
            plot = create_sentiment_plot(scores)
            self.send_json_response(200, {"scores": scores, "plot": plot})

        elif self.path == '/api/insta-analysis':
            session_id = data.get('sessionId')
            username = data.get('username')
            password = data.get('password')
            post_url = data.get('postUrl')
            if not (session_id or (username and password)) or not post_url:
                self.send_json_response(400, {"error": "Authentication details and post URL are required"})
                return
            result = analyze_insta_post(session_id, username, password, post_url)
            if "error" in result:
                self.send_json_response(500, result)
            else:
                self.send_json_response(200, result)
        else:
            self.send_error(404)

    def serve_file(self, filename, content_type):
        try:
            with open(filename, 'rb') as file:
                self.send_response(200)
                self.send_header('Content-type', content_type)
                self.end_headers()
                self.wfile.write(file.read())
        except FileNotFoundError:
            self.send_error(404, f"File Not Found: {filename}")

    def send_json_response(self, status_code, data):
        response_data = json.dumps(data).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Content-Length', str(len(response_data)))
        self.end_headers()
        self.wfile.write(response_data)

    def log_message(self, format, *args):
        return

def run_server():
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, MyHTTPRequestHandler)
    print("Server running at http://localhost:8000")
    print("Press Ctrl+C to stop the server.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer is shutting down.")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
