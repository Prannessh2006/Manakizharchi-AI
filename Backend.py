urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
nltk.download("all")
def textsentimentanalysis():
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
  sentence = input("Enter the text: ")

  lst = nltk.word_tokenize(sentence)

  words = set(stopwords.words("english"))

  punctuations = list(string.punctuation)

  lst = [i for i in lst if i not in punctuations]

  parts_of_speech = nltk.pos_tag(lst)

  for i in range(len(parts_of_speech)):
    parts_of_speech[i] = list(parts_of_speech[i])
    parts_of_speech[i][1] = get_wordnet_pos(parts_of_speech[i][1])

  lemmatizer = WordNetLemmatizer()
  for k in range(len(parts_of_speech)):
    parts_of_speech[k][0] = lemmatizer.lemmatize(parts_of_speech[k][0],pos=parts_of_speech[k][1])

  analyzer = SentimentIntensityAnalyzer()
  scores = analyzer.polarity_scores(sentence)

  print(f"Neutral sentiment: {scores['neu'] * 100}%.")
  print(f"Positive sentiment: {scores['pos'] * 100}%.")
  print(f"Negative sentiment: {scores['neg'] * 100}%.")
  print(f"Compound sentiment score: {scores['compound']}.")
  return

def instapostanalysis():
 

  encoding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

  genai.configure(api_key="AIzaSyAE1xIdEAge1jW9NGILWBJhhk2guanfDts")
  gemini = genai.GenerativeModel("gemini-2.5-flash")


  client = chromadb.Client(Settings(persist_directory="./comments_from_instagram"))
  c = Client()
  choice = list(map(str,input("Enter either your session ID or username along with password: ")))
  if(len(choice)==1):
      choice[0] = "78496214451%3AmyNN5mpFuWzRWo%3A14%3AAYjz96xbU-nIrztO6V-pd84rOKxHcuC6tSdsBjwpZQ"
      c.login_by_sessionid(choice[0])
  elif(len(choice)==2):
      c.login(choice[0], choice[1])
      
  url = input("Enter the URL of that post: ")
  
  media = c.media_pk_from_url(url)
  comments = c.media_comments(media, amount=1000)
  id = c.media_id(media)
  info = c.media_info(id)
  caption  = info.caption_text

  document = []
  output = []

  for comment in comments:
      text = comment.text
      document.append(text)
      new_text = ""

      for char in text:
          if char in emoji.EMOJI_DATA:
              meaning = emoji.demojize(char).strip(":").replace("_", " ")
              new_text += meaning + " "
          else:
              new_text += char

          output.append(new_text.strip())

  filtered_pairs = [(orig, clean) for orig, clean in zip(document, output) if clean and orig]
  document = [pair[0] for pair in filtered_pairs if pair[0]!=""]
  output = [pair[1] for pair in filtered_pairs if pair[1]!=""]

  collection = client.get_or_create_collection("Comment_Data")

  iqs = [str(i) for i in range(1,len(output)+1)]

  embedding = encoding_model.encode(output)

  metadatas_for_chroma = [{"original_text": original_comment} for original_comment in document]

  collection.add(documents=output, metadatas=metadatas_for_chroma, embeddings=embedding, ids=iqs)

  def comment_refinement(comments):

    prompt = f"""Given a list of Instagram comments {comments}, generate a set of interpreted statements that reflect the literal meaning or intent behind each original comment. Do not summarize the comments and do not modify their core meaning. Instead, rewrite each comment into a clear, explicit sentence expressing what the commenter intended.
Examples:
• “GOAT” should be rewritten as “The commenter is saying this person is the greatest of all time.”
• “Fire content” becomes “The commenter thinks the content is extremely good.”

Produce exactly {len(comments)} sentences, one for each comment, and end every sentence with a period.

The output should be a direct collection of interpreted meanings suitable for sentiment analysis. Keep the interpretations simple, literal, and aligned with the intent behind each comment."""

    response = gemini.generate_content(prompt)
    return response.text.strip()

  refined_ones = comment_refinement(output)
  refined_comments_list = refined_ones.split(".")
  refined_comments_list = [h for h in refined_comments_list if h]

  analyzer = SentimentIntensityAnalyzer()
  scores = []

  for i in refined_comments_list:
    score = analyzer.polarity_scores(i)

    scores.append(score["compound"])
  avg_score = sum(scores)/len(scores)

  LLM = ChatGroq(groq_api_key = "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",model="meta-llama/llama-4-scout-17b-16e-instruct")
  def teach_the_model_and_get_answer_based_on_the_score(description,sentimental_compound_score):
    prompt = f"""Analyze the emotional response of an Instagram audience using two inputs:

The post description {description}

The average sentiment compound score {sentimental_compound_score} ranging from -1 to 1
• -1 = strongly negative
• 0 = neutral or mixed
• 1 = strongly positive

Use the context of the post and the sentiment score together to determine the audience’s dominant emotional state. Classify the audience into one or more of the following categories and interpret what each means in relation to the content:

• Curious: The audience is intrigued and wants to know more. This occurs when the content is novel or unclear, and the sentiment score is slightly positive or neutral.
• Understanding: The audience grasps the message. Common when the content is informative and the sentiment score is positive.
• Accepting: The audience agrees with or embraces the content. Usually linked with high positive sentiment.
• Excited: The audience feels energized or motivated by the content. Seen with strongly positive sentiment around inspiring or innovative posts.
• Neutral or indifferent: The audience acknowledges the content but shows no strong emotional reaction. Associated with sentiment near 0 on straightforward or expected information.
• Confused or doubtful: The audience is unsure or questioning the content. Often occurs when the content is complex or ambiguous and the sentiment score is near 0 or slightly negative.
• Frustrated: The audience reacts negatively due to disagreement, annoyance, or unmet expectations. Seen with moderately negative sentiment.
• Frightened or worried: The audience perceives the content as threatening or concerning. Strongly negative sentiment combined with topics like advanced technology, risks, or warnings.
• Sad: The audience reacts with sorrow or empathy. Usually appears with negative sentiment on emotional or sensitive content.

Based on the post description and the sentiment score, provide:

The most fitting emotional category (or categories)

A brief explanation linking both the content context and the sentiment score to the emotional interpretation

Keep the response concise, direct, and context-driven."""

    response = LLM.invoke(prompt)
    return response.text.strip()

  print(teach_the_model_and_get_answer_based_on_the_score(caption,avg_score))
  return
