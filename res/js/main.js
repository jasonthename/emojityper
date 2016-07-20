// Hello you probably don't want to be involved with this js spaghetti, you probably want emojimap.js

$(document).ready(function() {

    // I'm sure this will be enough symbols.
    var SYMBOLS = '!"#$%&\'()*+,-./:;<=>?@[]^_`{|}~';

    // These things seperate words.
    var delimiters = [' ', ',', '\n'];


    function clearSuggestions() {
        $('span.alt-emoji').remove();
        $('div.alt').css('visibility', 'hidden');
    }

    function findPreceedingSpace(str, index) {
        for (var spaceIndex = index; spaceIndex >= 0; spaceIndex--) {
            if ($.inArray(str[spaceIndex], delimiters) > -1) {
                return spaceIndex;
            }
            // Or it's an emoji and there's no gap between the text and the emoji.
            // This is completely unmaintainable but it's 11:12pm and I believe in showing your mistakes on GitHub kinda like how people don't not post about bad things on Facebook to avoid the pressure of feeling like they have to keep a perfect image of themselves and also wa
            if (str.charCodeAt(spaceIndex) > 256) {
                return spaceIndex + 1;
            }
        }
        return 0;
    }

    function getWordBeforeCursor() {
        var cursorPosition = $input.prop('selectionStart');
        var text = $input.val();

        // -2 because we just pressed space
        var prevWord = text.slice(findPreceedingSpace(text, cursorPosition - 2), cursorPosition - 1);
        return prevWord;
    }

    function replaceLast(str, pattern, replacement) {
        // Replace the last occurrence of a pattern in a string.
        n = str.lastIndexOf(pattern);
        if (n !== -1) {
                return str.substring(0, n) + replacement + str.substring(n + pattern.length);
        }
        return null;
    }

    function replaceBeforeCursor(replacement) {
        // Replace the occurrence of `pattern` immediately before the cursor with `replacement`.

        var cursorPosition = $input.prop('selectionStart');
        var text = $input.val();
        var lastIndexOfPattern = text.lastIndexOf(pattern);
        var replacementText = text.substring(0, lastIndexOfPattern) + replacement + text.substring(lastIndexOfPattern + pattern.length);
        $input.val(replacementText);
    }

    var keycodes = [
            // Enter
            13,
            // .
            190,
            // ,
            188,
            // Space
            32
    ];

    var $input = $('input#emoji');
    var $alt = $('p.alt');

    // Dynamically add click handlers as the emoji are created.
    $('div.alt').on('click', 'span.alt-emoji', function() {

        var $this = $(this);
        var canonicalEmoji = $this.attr('data-canonical-emoji');
        var replacementEmoji = $this.attr('data-emoji');

        // It's fiiiine, just replace whatever's behind the cursor with the clicked thing.
        var newTextContent = replaceLast($input.val(), canonicalEmoji, replacementEmoji);
        $input.val(newTextContent);
        clearSuggestions();
        $input.focus();

        ga('send', {
            hitType: 'event',
            eventCategory: 'Translations',
            eventAction: 'suggestion-clicked',
            eventLabel: 'replacement',
            fieldsObject: {
                'emoji-presented': canonicalEmoji,
                'emoji-chosen': replacementEmoji

            }
        });
    });

    $input.click(function() {
        // Clear the suggestions when clicked so it's clear that you can only change emoji right after typing one.
        clearSuggestions();
    });

    $input.keyup(function(event) {
        clearSuggestions();


        var charBeforeCursorIsTriggerChar = false;
        // OKAY Chrome for Android always returns 0 for event.keyCode because "oooh maybe it's a voice input or a swipe input" WELL MAYBE IT ISN'T.
        // Sigh we'll just hack around that so people browsing the internet on their phones probably still in bed at 2pm 
        // on Saturday can still use this site even though their keyboard has excellent emoji support.
        if (event.keyCode == 0 || event.keyCode == 229) {
            // Okay SIKE sometimes it returns 229 whatever fine be that way
            // Find the cursor position, and check if the character before the cursor is a space
            var cursorPosition = $input.prop('selectionStart');
            charBeforeCursorIsTriggerChar = $.inArray($input.val().charCodeAt(cursorPosition - 1), keycodes);
        }

        if ($.inArray(event.keyCode, keycodes) !== -1 || charBeforeCursorIsTriggerChar) {

            var prevWord = getWordBeforeCursor();

            var word = prevWord.trim().toLowerCase();

            // Get all the punctuation at the start and end of the word juuust trust
            var firstSymbol = '';
            var lastSymbol = '';

            while (SYMBOLS.indexOf(word[0]) != -1) {
                firstSymbol += word[0];
                word = word.slice(1, word.length);
            }

            while (SYMBOLS.indexOf(word[word.length - 1]) != -1) {
                lastSymbol += word[word.length - 1];
                word = word.slice(0, word.length - 1);
            }

            // Look up the emoji.
            var emojiList = EMOJI_MAP[word];

            // No emoji found for this word.
            if (emojiList === undefined)  {
                $input.attr('disabled', false);

                // Show the "no emoji found" text.
                $("span#word-not-found").text(word);
                $("section.tip").css('visibility', 'visible');

                ga('send', {
                    hitType: 'event',
                    eventCategory: 'Translations',
                    eventAction: 'type-fail',
                    eventLabel: prevWord,
                });

                return;
            }
            else {
                // Send the emoji that you got straight to the NSA servers.
                ga('send', {
                    hitType: 'event',
                    eventCategory: 'Translations',
                    eventAction: 'type-success',
                    eventLabel: prevWord,
                });
            }

            var chosenEmoji = emojiList[0].emoji


            $alt.html(emojiList.map(function(i) {
                // How HTML was meant to be written @timbernerslee
                return '<span class="alt-emoji" data-canonical-emoji="' + chosenEmoji + '" data-emoji="' + i.emoji + '"' +'>' + i.emoji + '</span>';
            }).join(" "))

            // Replace the contents of the textarea with The Good Stuff
            var newInput = replaceLast($input.val(), prevWord, firstSymbol + chosenEmoji + lastSymbol);

            // XSS YOURSELF I DARE YOU
            $input.val(newInput);

            // Make HTML for each of the suggestions.
            var alt_emoji_html = emojiList.map(function(i) {
                return '<span class="alt-emoji btn btn-primary" alt="' + i.name + '" data-canonical-emoji="' + emojiList[0].emoji + '" data-emoji="' + i.emoji + '"' +'>' + i.emoji + '</span>';
            });

            // Don't show the suggestion box if there isn't more than one.
            if (alt_emoji_html.length < 2) {
                $input.attr('disabled', false);
                return;
            }

            // XSS ME I DARE YOU
            $alt.html(alt_emoji_html.join('\n'));

            // mmmm damn that's some smooth UX
            $('button.copy').css('visibility', 'visible');
            $('div.alt').css('visibility', 'visible');

        }
        else {
            $('button.copy').css('visibility', 'hidden');
            $('section.tip').css('visibility', 'hidden');
        }

        $input.attr('disabled', false);

    });

    var clipboard = new Clipboard('button.copy');
    var $clipboardBtn = $('button.copy');
    clipboard.on('success', function(e) {
        console.log("Copied!");
        $clipboardBtn.text('Copied!');
        window.setTimeout(function() {
            $clipboardBtn.text('Copy to clipboard');
        }, 1000);
        e.clearSelection();

    });

    // Register the Service Worker, if available on this browser.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }

});
