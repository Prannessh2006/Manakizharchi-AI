while True:
    user_choice = int(input("Enter 1 to analyze the sentiment of a text, or 2 to analyze the sentiment users have toward an Instagram post: "))
    if user_choice == 1:
        textsentimentanalysis()
    elif user_choice == 2:
        instapostanalysis()
    else:
        print("Thank you.")
        break
