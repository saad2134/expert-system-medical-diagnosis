import google.generativeai as genai
import pandas as pd

# Load the Excel file
df = pd.read_excel("questions.xlsx", engine="openpyxl")

# Convert Excel data to dictionary
qa_dict = dict(zip(df["Question"].str.lower(), df["Answer"]))  # Lowercase for case-insensitivity

# Configure Gemini API
genai.configure(api_key="")  # Replace with your API key
model = genai.GenerativeModel("gemini-1.5-flash")

# Function to get chatbot response
def chatbot_response(user_input):
    user_input = user_input.lower()  # Normalize input
    
    # Step 1: Check if the question exists in the Excel file
    if user_input in qa_dict:
        return qa_dict[user_input]

    # Step 2: If not found, use Gemini API
    try:
        response_obj = model.generate_content(user_input)
        return response_obj.text if hasattr(response_obj, "text") else "I'm sorry, I don't understand that."
    except Exception as e:
        return f"Error communicating with Gemini API: {str(e)}"

# Chat loop (optional)
while True:
    user_input = input("You: ")
    if user_input.lower() == "exit":
        break
    print("Chatbot:", chatbot_response(user_input))
