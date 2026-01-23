import os
import pickle
import datetime

import numpy as np
import pandas as pd

import json
import jwt
import os
import requests

import openai
import tiktoken
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.simplefilter(action='ignore', category=FutureWarning)
warnings.warn("deprecated", DeprecationWarning)

EMBEDDING_MODEL = "text-embedding-ada-002"


class ModelBot():

  def __init__(self, pdf_file="./Processed_PDFs.csv", embedding_file="./Embeddings.pkl", modelEngine = None, embeddingModelEngine = None, translateModelEngine = None):
    assert modelEngine is not None
    assert embeddingModelEngine is not None
    assert translateModelEngine is not None
    self.temp = 0.2
    self.max_token = 1024    
    self.context_length = 3000
    self.model = "gpt-4-32k"
    self.input_language="English"
    self.output_language="English"
    #method = "Policy Extraction"
    #MODEL = st.radio("GPT Model", ("gpt-4-32k", "gpt-4", "gpt-3.5-turbo"))
    self.pdf_file = pdf_file
    self.embedding_file = embedding_file
    self.doc_df = pd.read_csv(self.pdf_file)
    self.doc_df.set_index(["doc_index"], inplace=True)
    print("Document DF loaded -", str(datetime.datetime.now()))
    with open(self.embedding_file, "rb") as embeddings_pkl:
        self.doc_embeddings = pickle.load(embeddings_pkl)
    # Read the dictionary of embeddings created from all PDFs from a pickle file
    print("Document Embeddings Loaded -", str(datetime.datetime.now()))
    self.messages = [] # this just seems like a list.. keeps chat history
    self.EMBEDDING_MODEL = "text-embedding-ada-002"
    # model engines for different openai calls, if these arent provided we make the call here
    self.modelEngine = modelEngine
    self.embeddingModelEngine = embeddingModelEngine
    self.translateModelEngine = translateModelEngine 


  def query(self, question=None, temp=0.2, max_token=1024):
    conclusion, detailed_answer = self.answer_conversationally(self.doc_embeddings, self.doc_df, question, temp, max_token)                                                          
    return json.dumps({'conclusion': conclusion, 'detailed_answer': detailed_answer})

  def answer_conversationally(self,embeddings: dict, input_df: pd.DataFrame, question, temp, max_token):
    self.messages = [{"role": "system", "content": "You are an intellgent AI assistant designed to answer queries based on government policy documents. You answer as truthfully as possible at all times and tell the user if you do not know the answer."}]
    terminologies = """
                    Explanations of some terminologies used in questions/ policy documents are given below:
                    1. All Programs: All Programs refer to Food Assistance Program, Medicaid, CDC, SER and FIP (TANF).
                    2. Food Assistance Program (FAP): SNAP is referred to as FAP in Michigan.
                    """
    # this is kind of what keeps the chat history
    self.messages.append(
        {"role": "system", "content": terminologies.replace("\t", " ")})
    if self.input_language != "English":
      print("Non-English input selected .....", end=" ")
      question = self.translate_text_using_gpt4(text=question, language="English",
                                           max_token=max_token)
      print("Question translated to English at", str(datetime.datetime.now()))
    
    # actual prompting happens 
    prompt, sources = self.construct_prompt_para(question, embeddings, input_df)
    self.messages.append({"role": "user", "content": question})
    self.messages.append({"role": "user", "content": prompt})
    
    # Calling GPT to get the answer
    answer, references = self.answer_query_with_context_using_gpt4_and_streaming(self.messages, sources, question,
                                                                            temp, max_token)
    # print("Answer generated -", str(datetime.datetime.now()))
    reasoning = "Not Applicable"
    additional_info = "Not Applicable"
    conclusion = "Sorry, I am not sure of the answer to your question. Kindly consult with the appropriate agency for further assistance."
    if "Error" not in answer:
        if "Reasoning" in answer:
            answer = answer.split("Reasoning:")[1]
            if "Conclusion:" in answer:
                reasoning = answer.split("Conclusion:")[0].strip("\n ")
                conclusion = answer.split("Conclusion:")[1]
                if "Information required to provide a better answer:" in conclusion:
                    additional_info = conclusion.split(
                        "Information required to provide a better answer:")[1].strip("\n ")
                    if "None" in additional_info:
                        additional_info = "Not Applicable"
                    conclusion = conclusion.split(
                        "Information required to provide a better answer:")[0].strip("\n ")
                else:
                    conclusion = conclusion.strip("\n ")
            else:
                reasoning = answer.strip("\n ")
        detailed_answer = f"Reasoning:\n\n{reasoning}\n\n\nInformation required to provide a better answer:\n\n{additional_info}\n\n\nFurther Reading:\n"
        conclusion = conclusion.replace(
            "**", "").replace("_", "-").replace("$", "USD ")
        detailed_answer = detailed_answer.replace(
            "**", "").replace("_", "-").replace("$", "USD ")
        # print("Answer reformatted -", str(datetime.datetime.now()))
        
        # remove the last question it was error ?
        #del self.messages[-1]
        self.messages.append({"role": "assistant", "content": answer})
        #st.session_state["chat_history"] = messages
        if self.output_language != "English":
          print("Non-English output required!")
          # Translate back to english. I mean clearly the end user wants a different language but why give him that.. there is a reason why english is the most spoken language :)
          translated_conclusion = self.translate_text_using_gpt4(text=f"Conclusion:\n{conclusion}",
                                                            language=self.output_language, max_token=max_token)
          print(
              f"Conclusion translated to {self.output_language} -", str(datetime.datetime.now()))
          translated_detailed_answer = self.translate_text_using_gpt4(text=detailed_answer,
                                                                 language=self.output_language, max_token=max_token)
          translated_detailed_answer += f"\n{str(references)}"
          print(
              f"Detailed answer translated to {self.output_language} -", str(datetime.datetime.now()))
          return translated_conclusion, translated_detailed_answer
        else:
          detailed_answer += f"\n{str(references)}"
          return conclusion, detailed_answer
    else:
        raise Exception(f"{answer}")
        
  def construct_prompt_para(self, question: str, context_embeddings: dict,
                          input_df: pd.DataFrame, diagnostics=False) -> str:
    """
    Input: User query, word embeddings of all the documents, dataframe of the input documents.
    Output: Final prompt sent to the GPT model that contains instructions as well as context.
    """
    MAX_CONTEXT_LEN = self.context_length
    SEPARATOR = "\n* "
    ENCODING = "gpt2"  # encoding for text-davinci-003, which is our completions model
    encoding = tiktoken.get_encoding(ENCODING)
    separator_len = len(encoding.encode(SEPARATOR))

    most_relevant_document_sections = self.order_document_sections_by_query_similarity(
        question, context_embeddings)

    chosen_sections = []
    chosen_sections_len = 0
    chosen_sections_indices = []
    if diagnostics:
        chosen_sections_similarities = []

    # Loop to add chunks from our input documents as context until we hit the maximum token limit specified in MAX_CONTEXT_LEN (determined by the choice of model used for completions)
    for score, section_index in most_relevant_document_sections:
        # Read each chunk of the input document (i.e. one row of the input df)
        document_section = input_df.loc[section_index, :]
        # Add the number of tokens from the current chunk into the prompt token counter
        chosen_sections_len += document_section.tokens + separator_len
        # Break from the loop once the length of all sections chosen exceeds the maximum token limit
        if chosen_sections_len > MAX_CONTEXT_LEN:
            break

        # Extract metadata about the current section
        underscore_idx = [i for i in range(
            len(section_index)) if section_index[i] == '_']
        document_name = str(section_index[:underscore_idx[0]]).upper()
        # print(section_index)
        page_number = str(section_index[(underscore_idx[0]+1):underscore_idx[1]])
        # Extract and shorten URL
        url = str(document_section.url)
        document_index = f"Document Name: {document_name}, Page Number: {page_number}, Document URL: {url}\n"
        # Store all chunks selected to form the prompt's context in a list along with the separator string for each chunk
        chosen_sections.append(
            SEPARATOR + document_index + document_section.content.replace('\n', ' '))
        # Stores the indentifying index of each selected document chunk in a list
        chosen_sections_indices.append(str(section_index))
        if diagnostics:
            underscore_idx = [i for i in range(
                len(section_index)) if section_index[i] == '_']
            section_str = str(section_index[:underscore_idx[0]].upper()
                              + ', pg.' + section_index[(underscore_idx[0]+1):underscore_idx[1]]
                              + " (Similarity = " + str(score) + ')')
            chosen_sections_similarities.append(section_str)

    if diagnostics:
        # Prints diagnostic information regarding the selected chunks
        print(
            f"Selected {len(chosen_sections)} document sections! Section IDs are:")
        print("\n".join(chosen_sections_similarities))

    sources = {}
    for section_index in chosen_sections_indices:
        underscore_idx = [i for i in range(
            len(section_index)) if section_index[i] == '_']
        section_str = str(section_index[:underscore_idx[0]].upper()
                          + ', pg.' + section_index[(underscore_idx[0]+1):underscore_idx[1]])
        sources[section_str] = input_df.loc[input_df.index == section_index, "url"].item()

    # Defines the prompt header that is appended prior to the context. GPT is instructed to answer truthfully if the relevant context is not provided.
    context_header = "A context delimited by triple backticks is provided below. This context may contain plain text extracted from paragraphs or images. Tables extracted are represented as a 2D list in the following format - '[[Column Headers], [Comma-separated values in row 1], [Comma-separated values in row 2] ..... [Comma-separated values in row n]]'\n"
    footer = """Answer the user's question truthfully using the context only. Use the following section-wise format (in the order given) to answer the question with instructions for each section in angular brackets:
                Reasoning:
                <State your reasoning step-wise in bullet points. Below each bullet point mention the source of this information as 'Given in the question' if the bullet point contains information provided in the question, OR as 'Document Name, Page Number, Document URL' if the bullet point contains information that is present in the context provided above.>
                Conclusion:
                <Write a short concluding paragraph stating the final answer and explaining the reasoning behind it briefly. State caveats and exceptions to your answer if any.>
                Information required to provide a better answer:
                <If you cannot provide an answer based on the context above, mention the additional information that you require to answer the question fully as a list.>"""
    disclaimer = "Do not compromise on your mathematical and reasoning abilities to fit the user's instructions. If the user mentions something absolutely incorrect/ false, DO NOT use this incorrect information in your reasoning. Also, please correct the user gently."
    context = " ".join(chosen_sections)
    prompt_with_context = context_header + f"```{context}```" + \
        "\n" + footer + disclaimer
    return prompt_with_context, sources

  def answer_query_with_context_using_gpt4_and_streaming(self,messages: list, sources: dict, question:str,
                                                       temp: float, max_token: int, 
                                                       show_prompt=False):
    """
    Input: The constructed prompt with the relevant context and the user-query
    Output: GPT-4's response to the user query given the relevant context, without any hallucination or creativity. No metadata returned.
    """
    try:
      if show_prompt:
          print("\nMessages:\n", messages)

      #response = openai.ChatCompletion.create(model=self.model, messages=messages,
       #                                       temperature=temp, max_tokens=max_token)
      
      answer = self.modelEngine.ask(question = question, param_dict = {"full_prompt":messages, "temperature":temp, "max_new_tokens":max_token})
      answer = answer[0]['response']


      print(answer)
      further_reading = ""
      doc_names = list(set([doc_name[:doc_name.find(", pg.")].strip() for doc_name in sources.keys()]))
      for sr_no, doc_name in enumerate(doc_names, start=1):
          pages = [source[source.find("pg."):]
                   for source in sources.keys()
                   if doc_name in source]
          url = str([source_url for source_name, source_url in sources.items()
                     if doc_name in source_name][0])
          further_reading += f"""{sr_no}. {doc_name}: {", ".join(pages)}\n\n   Link: {url}\n"""
      return answer, further_reading
    except (openai.error.APIError, openai.error.ServiceUnavailableError):
        return "Error! OpenAI GPT server busy! Please retry after a few minutes.", ""
    except openai.error.AuthenticationError:
        return "Error! API Key invalid/ expired! Please check your API key.", ""
    except openai.error.APIConnectionError:
        return "Error! Unable to connect to GPT server! Please check your internet connection and firewall/ proxy settings.", ""
    except (openai.error.Timeout, openai.error.RateLimitError):
        return "Error! Request timed-out! Please retry after a few minutes.", ""
        
  def translate_text_using_gpt4(self, text: str, language: str, max_token: int):
    """
    Input: English text to be translate and the language to be translated into.
    Output: GPT-4 translated text.
    """
    try:
      translation = self.translateModelEngine.ask(question = f"Translate the text above in {language}", context = text, param_dict = {"temperature":0, "max_new_tokens":max_token})[0]['response']
      
      return translation
    except (openai.error.APIError, openai.error.ServiceUnavailableError):
        raise Exception(
            "Error! OpenAI GPT server busy! Please retry after a few minutes.")
    except openai.error.AuthenticationError:
        raise Exception(
            "Error! API Key invalid/ expired! Please check your API key.")
    except openai.error.APIConnectionError:
        raise Exception(
            "Error! Unable to connect to GPT server! Please check your internet connection and firewall/ proxy settings.")
    except (openai.error.Timeout, openai.error.RateLimitError):
        raise Exception(
            "Error! Request timed-out! Please retry after a few minutes.")
  
  def get_predefined_response(self, query, qafinal, qaembeddings):
    query_embedding = self.get_embedding(query)
    question_similarities = sorted([(self.vector_similarity(query_embedding, question_embedding), question_no)
                                    for question_no, question_embedding in qaembeddings.items()],
                                   reverse=True)
    if question_similarities[0][0] > 0.9:
        most_similar_question_idx = question_similarities[0][1]
        response = f"""Conclusion: {qafinal.loc[most_similar_question_idx, "answer"]}\n\n
            NOTE: This is a pre-defined answer since I am {round(question_similarities[0][0], 1)*100}% sure that your
                question is similar to "{qafinal.loc[most_similar_question_idx, "question"]}" that has been answered in our FAQ.\ 
                Please re-phrase your question if you are not happy with my answer. Thank you!"""
    else:
        response = "No pre-defined answer found!"
    return response

  def order_document_sections_by_query_similarity(self, query: str, contexts: dict[(str, str), np.array]) -> list[(float, (str, str))]:
    """
    Input: The user-query text (string) and the content of all documents (context) along with their word embeddings (dict).
    Output: A list of the most similar chunks of text according to vector similarity between the embeddings of the query-text and the context.
    """
    # Compute the word embeddings of the user-query
    query_embedding = self.get_embedding(query)
    # Compute the similarity between different chunks of the input documents and the user-query and store the same in a list sorted in descending order of similarity.
    document_similarities = sorted([(self.vector_similarity(query_embedding, doc_embedding), doc_index)
                                    for doc_index, doc_embedding in contexts.items()],
                                   reverse=True)
    return document_similarities

  # Compute embedding for a text string using an embedding model (default: 'text-embedding-ada-002').
  def get_embedding(self, text: str, model: str = EMBEDDING_MODEL) -> list[float]:
    """
    Input: A text string.
    Output: The word embedding for the text string using the model defined in EMBEDDING_MODEL (default: 'text-embedding-ada-002').
    """
    result = self.embeddingModelEngine.embeddings(question = text, param_dict = {})[0]
    return result["data"][0]["embedding"]


  # Calculate the vector similarity between two text strings
  def vector_similarity(self, x: list[float], y: list[float]) -> float:
    """
    Input: Two lists x & y. Each list contains the embeddings of a text string.
    Output: Dot product (a float) of x & y (parsed as NumPy arrays).
            NOTE: Since OpenAI embeddings are normalized to length 1, the dot product is equivalent to the cosine similarity.
    """
    return np.dot(np.array(x), np.array(y))

  def order_document_sections_by_query_similarity(self, query: str, contexts: dict[(str, str), np.array]) -> list[(float, (str, str))]:
    """
    Input: The user-query text (string) and the content of all documents (context) along with their word embeddings (dict).
    Output: A list of the most similar chunks of text according to vector similarity between the embeddings of the query-text and the context.
    """
    # Compute the word embeddings of the user-query
    query_embedding = self.get_embedding(query)
    # Compute the similarity between different chunks of the input documents and the user-query and store the same in a list sorted in descending order of similarity.
    document_similarities = sorted([(self.vector_similarity(query_embedding, doc_embedding), doc_index)
                                    for doc_index, doc_embedding in contexts.items()],
                                   reverse=True)
    return document_similarities
