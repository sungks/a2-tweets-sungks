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

	//reset UI on load
	document.getElementById('searchCount').innerText = '0';
	document.getElementById('searchText').innerText = '';
	const body = document.getElementById('tweetTable');
	if (body) body.innerHTML = '';
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

      if (typeof t.getHTMLTableRow === 'function') {
        const row = t.getHTMLTableRow(i + 1);

        if (row && row.nodeType === 1 && row.tagName === 'TR') {
          body.appendChild(row);
          continue;
        }

        if (typeof row === 'string') {
          body.insertAdjacentHTML('beforeend', row);
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