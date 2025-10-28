let tweet_array = [];
let writtenTweets = [];

function parseTweets(runkeeper_tweets) {
	//Do not proceed if no tweets loaded
	if(runkeeper_tweets === undefined) {
		window.alert('No tweets returned');
		return;
	}

	//TODO: Filter to just the written tweets
	//build Tweet objects
	tweet_array = runkeeper_tweets.map(t => new Tweet(t.text, t.created_at));
	writtenTweets = tweet_array.filter(t => t.written);

	//compute sentiment for written tweets
	for (const t of writtenTweets) {
		const txt = (typeof t.writtenText === 'string' && t.writtenText.length) ? t.writtenText : (t.text || '');
		t._sentiment = analyzeSentiment(txt);
  	}

	//reset UI on load
	document.getElementById('searchCount').innerText = '0';
	document.getElementById('searchText').innerText = '';
	const body = document.getElementById('tweetTable');
	if (body) body.innerHTML = '';
}

//helpers for the data mining extra implementation
const POS_WORDS = new Set([
  'amazing','awesome','beautiful','best','brilliant','cheerful','clean','cool','delightful','enjoyable',
  'excellent','excited','fantastic','favorite','glad','good','great','happy','incredible','love','loved',
  'lovely','motivated','nice','pleasant','positive','relaxed','satisfying','spectacular','super','terrific',
  'wonderful','wow'
]);

const NEG_WORDS = new Set([
  'angry','annoyed','awful','bad','boring','broken','confused','crazy','depressing','disappointing','dislike',
  'exhausted','hard','hate','hated','horrible','hurt','meh','miserable','painful','poor','sad','sore',
  'stressful','terrible','tired','ugly','upset','weak','worse','worst'
]);

//common negators; flips the next adjective's polarity within a short window
const NEGATORS = new Set(['not','no','never','hardly','scarcely','barely','without','isn’t','aren’t','wasn’t','weren’t','don’t','doesn’t','didn’t','won’t','can’t','couldn’t']);

const EMOJI_POS = /[\u{1F601}-\u{1F64C}\u{1F60A}\u{1F60D}\u{1F929}\u{1F44D}]/u;
const EMOJI_NEG = /[\u{1F614}\u{1F61E}\u{1F622}\u{1F62D}\u{1F620}\u{1F44E}]/u;

function cleanTweetText(raw) { //normalize the tweets
  return (raw || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')   
    .replace(/#\w+/g, ' ')              
    .replace(/@\w+/g, ' ')         
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return text.split(/\s+/).map(t => t.replace(/^[^a-z]+|[^a-z]+$/g, '')).filter(Boolean);
}

/**
 * Returns: { score: number, label: 'Positive'|'Negative'|'Neutral', emoji: '🟢'|'🔴'|'⚪' }
 */
function analyzeSentiment(rawText) {
  const text = cleanTweetText(rawText);
  const toks = tokenize(text);

  let score = 0;
  //tiny emoji nudges 
  if (EMOJI_POS.test(rawText || '')) score += 0.5;
  if (EMOJI_NEG.test(rawText || '')) score -= 0.5;

  //look for negators; if found, invert polarity of the *next* polarity token within 3 words
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i];
    if (!w) continue;

    if (POS_WORDS.has(w) || NEG_WORDS.has(w)) {
      //check for a nearby negator just before this word
      let negated = false;
      for (let j = Math.max(0, i - 3); j < i; j++) {
        if (NEGATORS.has(toks[j])) { negated = true; break; }
      }
      const base = POS_WORDS.has(w) ? 1 : -1;
      score += negated ? -base : base;
    }
  }

  let label = 'Neutral', emoji = '⚪'; //if no negative or positive
  if (score > 0.25) { label = 'Positive'; emoji = '🟢'; }
  else if (score < -0.25) { label = 'Negative'; emoji = '🔴'; }

  return { score: Number(score.toFixed(2)), label, emoji };
}

function formatSentiment(s) {
  if (!s) return '';
  return `${s.emoji} ${s.label} (${s.score})`;
}


function addEventHandlerForSearch() {
  const input = document.getElementById('textFilter');
  const body  = document.getElementById('tweetTable');
  const countSpan = document.getElementById('searchCount');
  const textSpan  = document.getElementById('searchText');

  if (!input || !body) return;

  input.addEventListener('input', function () {
    const q = (input.value || '').trim();
    textSpan.innerText = q;

    //clear table each time
    body.innerHTML = '';

    if (q === '') {
      countSpan.innerText = '0';
      return;
    }

    const qLower = q.toLowerCase();

    //search only within user-written tweets
    const matches = writtenTweets.filter(t => {
      let txt = (typeof t.writtenText === 'string' && t.writtenText.length)
        ? t.writtenText
        : (t.text || '');
      txt = txt.toLowerCase()
               .replace(/#runkeeper/gi, '')
               .replace(/https?:\/\/\S+/g, '')
               .replace(/\s+/g, ' ')
               .trim();
      return txt.includes(qLower);
    });

    countSpan.innerText = String(matches.length);

    //populate table rows
    for (let i = 0; i < matches.length; i++) {
	const t = matches[i];
	const sentimentCell = `<td class="sentiment-cell">${formatSentiment(t._sentiment)}</td>`;

	if (typeof t.getHTMLTableRow === 'function') {
		const row = t.getHTMLTableRow(i + 1);

		if (row && row.nodeType === 1 && row.tagName === 'TR') {
		//append sentiment <td> to the returned <tr>
		const td = document.createElement('td');
		td.className = 'sentiment-cell';
		td.textContent = formatSentiment(t._sentiment);
		row.appendChild(td);
		body.appendChild(row);
		continue;
		}

		if (typeof row === 'string') {
		//insert cell before the closing </tr>
		const patched = row.replace(/<\/tr>\s*$/i, sentimentCell + '</tr>');
		body.insertAdjacentHTML('beforeend', patched);
		continue;
		}
	}

	const activity = t.activityType || 'unknown';
	const linkified = (t.text || '').replace(
		/(https?:\/\/[^\s]+)/g,
		'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
	);

	body.insertAdjacentHTML(
		'beforeend',
		'<tr>' +
		'<td>' + (i + 1) + '</td>' +
		'<td>' + activity + '</td>' +
		'<td>' + linkified + '</td>' +
		sentimentCell +
		'</tr>'
	);
	}
  });
} 

//Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function (event) {
	addEventHandlerForSearch();
	loadSavedRunkeeperTweets().then(parseTweets);
});