import json


with open("stopwords.txt") as f:
    stopwords = set(map(str.strip, f.readlines()))

with open("annotations.txt") as f:
    # Maps a word to a list of emoji objects (name and emoji, sorted by relevance)
    # Words in the emoji's name take priority over words in the tags.
    # Ah screw it let's just use the tags
    tag2emoji = {}

    for line in f:
        line = line.strip()
        print(line)
        if line.count("|") < 2:

            # Add the name as tags if there are no tags
            line += "|" + ",".join(map(str.lower, line.split("|")[1].split(" ")))

        emoji, name, tags = line.split("|")


        # Ignore skintone modifiers etc because they display as 2 characters.
        # ...sometimes? In my browser? Someone on GitHub save me.
        if "TYPE" in name:
            continue


        tagslist = []

        # First add the interesting words in the emoji name (remove stopwords).
        for word in name.lower().split():
            if word not in stopwords:
                tagslist.append(word)

        # Then add the tags.
        # Turn multi words tags into single word tags, and remove duplicates.
        # Use the longest words first, assuming they contain the most meaning.
        tagslist.extend((tags.replace(" ", ",").split(",")))

        # Remove duplicates
        tagslist = set(tagslist)

        for tag in tagslist:
            emoji_data = {
                    "emoji": emoji,
                    "name": name
            }

            if tag in tag2emoji:
                tag2emoji[tag].append(emoji_data)
            else:
                tag2emoji[tag] = [emoji_data]



"""
with open("../js/emojimap.js", "w") as f:
    # SO LEGIT
    f.write("var EMOJI_MAP = ")
    f.write(json.dumps(tag2emoji, indent=4, sort_keys=True))
"""
print("Not writing to file. It would possibly overwrite local changes!")
