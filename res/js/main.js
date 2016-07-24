// Hello you probably don't want to be involved with this js spaghetti, you probably want emojimap.js

'use strict';

$(document).ready(function() {
    var suggestWords = (function() {
        var prefixLength = 3;   // generate prefixes up to this length
        var maxSuggestions = 10;  // only generate this many suggestions
        var prefixSuggest = {};
        for (var k in EMOJI_MAP) {
            var prefix = k.substr(0, prefixLength);
            for (var i = 1; i <= prefix.length; ++i) {
                var part = prefix.substr(0, i);
                var opts = prefixSuggest[part];
                if (!opts) {
                    opts = prefixSuggest[part] = [];
                }
                if (opts.length < maxSuggestions) {
                    opts.push(k);
                }
            }
        }

        return function(typed) {
            var all = prefixSuggest[typed.substr(0, prefixLength)];
            var rest = typed.substr(prefixLength);
            if (rest && all) {
                all = all.filter(function(word) {
                    return word.substr(prefixLength).startsWith(rest);
                });
            }
            return all;
        }
    }());

    function clearSuggestions() {
        $('span.alt-emoji').remove();
        $('div.alt').addClass('invis');
    }

    function findLastSpace(str) {
        for (var spaceIndex = str.length - 1; spaceIndex >= 0; spaceIndex--) {
            // Spaces and ',' separate words.
            if (str[spaceIndex].match(/[\s,]+/)) {
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
        var text = $input.val().substr(0, cursorPosition).trim().replace(/,$/, '');
        return text.substr(findLastSpace(text)).trim();
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
            // lol
            -1,
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
    var $suggest = $('section.suggest');
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

    // Dynamically add click handlers as the suggestions are created.
    $suggest.on('click', 'span', function() {

        var $this = $(this);

        // It's fiiiine, just replace whatever's behind the cursor with the clicked thing.
        var newTextContent = replaceLast($input.val(), getWordBeforeCursor(), $this.text());
        $input.val(newTextContent);
        $input.focus();
        handleKeyUp();
    });

    $input.click(function() {
        // Clear the suggestions when clicked so it's clear that you can only change emoji right after typing one.
        clearSuggestions();
    });

    var autocompleteTimeout;
    function handleKeyUp(event) {
        clearSuggestions();
        window.clearTimeout(autocompleteTimeout);
        var text = $input.val();
        var keyCode = (event ? event.keyCode : -1);

        var charBeforeCursorIsTriggerChar = false;

        // OKAY Chrome for Android always returns 0 for event.keyCode because "oooh maybe it's a voice input or a swipe input" WELL MAYBE IT ISN'T.
        // Sigh we'll just hack around that so people browsing the internet on their phones probably still in bed at 2pm 
        // on Saturday can still use this site even though their keyboard has excellent emoji support.
        if (keyCode == 0 || keyCode == 229) {

            // Okay SIKE sometimes it returns 229 whatever fine be that way
            // Find the cursor position, and check if the character before the cursor is a space
            var cursorPosition = $input.prop('selectionStart');
            charBeforeCursorIsTriggerChar =
                keycodes.indexOf(text.charCodeAt(cursorPosition - 1)) != -1;
        }
        if (keycodes.indexOf(keyCode) == -1 && !charBeforeCursorIsTriggerChar) {
            // This isn't the end of a word, give up.
            $('button.copy').addClass('invis');
            $('section.tip').addClass('invis');

            autocompleteTimeout = window.setTimeout(function() {
                var word = getWordBeforeCursor().toLowerCase();
                var words = suggestWords(word) || [];
                $suggest.html(words.map(function(word) {
                    return '<span>' + word + '</span>';
                }).join(' '));
            }, 50);
            return;
        }

        $suggest.html('');
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
                $("section.tip").removeClass('invis');
                // sup nsa
                ga('send', {
                    hitType: 'event',
                    eventCategory: 'Translations',
                    eventAction: 'type-fail',
                    eventLabel: emojiWord,
                });
            }
            return;
        }
        var chosenEmoji = emojiList[0].emoji;

        // Send the emoji that you got straight to the NSA servers.
        ga('send', {
            hitType: 'event',
            eventCategory: 'Translations',
            eventAction: 'type-success',
            eventLabel: emojiWord,
        });

        // Replace the contents of the textarea with The Good Stuff
        var prefix = prevWord.substr(0, match.index);
        var suffix = prevWord.substr(match.index + match[0].length);
        var newInput = replaceLast($input.val(), prevWord, prefix + chosenEmoji + suffix);
        $input.val(newInput);

        // mmmm damn that's some smooth UX
        $('button.copy').removeClass('invis');

        // If we have suggestions, make some sweet HTML and add it to the page.
        if (emojiList.length > 1) {
            $alt.html(emojiList.map(function(i) {
                return '<span class="alt-emoji btn btn-primary" alt="' + i.name + '" data-canonical-emoji="' + emojiList[0].emoji + '" data-emoji="' + i.emoji + '"' +'>' + i.emoji + '</span>';
            }).join(''));
            $('div.alt').removeClass('invis');
        }
    };
    $input.keyup(handleKeyUp);

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
    // This website sponsored by Google Developer "Evangelists".
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
    }

});
