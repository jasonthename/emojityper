// Hello you probably don't want to be involved with this js spaghetti, you probably want emojimap.js

'use strict';

$(document).ready(function() {

    // These things seperate words.
    var delimiters = [' ', ',', '\n'];


    function clearSuggestions() {
        $('span.alt-emoji').remove();
        $('div.alt').css('visibility', 'hidden');
    }

    function findPreceedingSpace(str, index) {
        for (var spaceIndex = index; spaceIndex >= 0; spaceIndex--) {
            if (delimiters.indexOf(str[spaceIndex]) != -1) {
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
        var n = str.lastIndexOf(pattern);
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
        var text = $input.val();

        var charBeforeCursorIsTriggerChar = false;
        // OKAY Chrome for Android always returns 0 for event.keyCode because "oooh maybe it's a voice input or a swipe input" WELL MAYBE IT ISN'T.
        // Sigh we'll just hack around that so people browsing the internet on their phones probably still in bed at 2pm 
        // on Saturday can still use this site even though their keyboard has excellent emoji support.
        if (event.keyCode == 0 || event.keyCode == 229) {
            // Okay SIKE sometimes it returns 229 whatever fine be that way
            // Find the cursor position, and check if the character before the cursor is a space
            var cursorPosition = $input.prop('selectionStart');
            charBeforeCursorIsTriggerChar =
                keycodes.indexOf(text.charCodeAt(cursorPosition - 1)) != -1;
        }
        if (keycodes.indexOf(event.keyCode) == -1 && !charBeforeCursorIsTriggerChar) {
            // This isn't the end of a word, give up.
            $('button.copy').css('visibility', 'hidden');
            $('section.tip').css('visibility', 'hidden');
            return;
        }

        var prevWord = getWordBeforeCursor();

        // Find the most word-like bits of the thing entered. Don't match symbols on the EDGE \m/
        var match = /\w.*\w|\w/.exec(prevWord);
        var emojiWord = match ? match[0].toLowerCase() : '';

        // Look up the emoji.
        var emojiList = EMOJI_MAP[emojiWord];
        if (!emojiList) {
            // No emoji found for this word, show the sad the "no emoji found" text if the word
            // wasn't just symbols.
            if (emojiWord) {
                $("span#word-not-found").text(emojiWord);
                $("section.tip").css('visibility', 'visible');
                ga('send', {
                    hitType: 'event',
                    eventCategory: 'Translations',
                    eventAction: 'type-fail',
                    eventLabel: emojiWord,
                });
            }
            return;
        }

        // Send the emoji that you got straight to the NSA servers.
        ga('send', {
            hitType: 'event',
            eventCategory: 'Translations',
            eventAction: 'type-success',
            eventLabel: emojiWord,
        });

        var chosenEmoji = emojiList[0].emoji;
        $alt.html(emojiList.map(function(i) {
            // How HTML was meant to be written @timbernerslee
            return '<span class="alt-emoji" data-canonical-emoji="' + chosenEmoji + '" data-emoji="' + i.emoji + '"' +'>' + i.emoji + '</span>';
        }).join(' '))

        // Replace the contents of the textarea with The Good Stuff
        var prefix = prevWord.substr(0, match.index);
        var suffix = prevWord.substr(match.index + match[0].length);
        var newInput = replaceLast($input.val(), prevWord, prefix + chosenEmoji + suffix);
        $input.val(newInput);

        // mmmm damn that's some smooth UX
        $('button.copy').css('visibility', 'visible');

        // If we have suggestions, make some sweet HTML and add it to the page.
        if (emojiList.length > 1) {
            var altEmojiHTML = emojiList.map(function(i) {
                return '<span class="alt-emoji btn btn-primary" alt="' + i.name + '" data-canonical-emoji="' + emojiList[0].emoji + '" data-emoji="' + i.emoji + '"' +'>' + i.emoji + '</span>';
            }).join('\n');

            // XSS ME I DARE YOU
            $alt.html(altEmojiHTML);
            $('div.alt').css('visibility', 'visible');
        }
    });

    var clipboard = new Clipboard('button.copy');
    var $clipboardBtn = $('button.copy');
    var resetTimeout;

    clipboard.on('success', function(e) {
        console.info('Copied to clipboard:', $input.val());
        $clipboardBtn.text('Copied!');

        window.clearTimeout(resetTimeout);
        resetTimeout = window.setTimeout(function() {
            $clipboardBtn.text('Copy to clipboard');
        }, 1000);
        e.clearSelection();

    });

    // Register the Service Worker, if available on this browser.
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
    }

});
