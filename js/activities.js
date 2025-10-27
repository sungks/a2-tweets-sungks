function parseTweets(runkeeper_tweets) {
	//Do not proceed if no tweets loaded
	if(runkeeper_tweets === undefined) {
		window.alert('No tweets returned');
		return;
	}
	
	tweet_array = runkeeper_tweets.map(function(tweet) {
		return new Tweet(tweet.text, tweet.created_at);
	});

	const completed = tweet_array.filter(t => t.source === 'completed_event');

	//TODO: create a new array or manipulate tweet_array to create a graph of the number of tweets containing each type of activity.
	const agg = new Map();
	for (const t of completed) {
		const name = t.activityType || 'unknown';
		const dist = Number(t.distance) || 0;
		if (!agg.has(name)) agg.set(name, { count: 0, total: 0 });
		const rec = agg.get(name);
		rec.count += 1;
		rec.total += dist;
	}

	const rows = [...agg.entries()].map(([activityType, { count, total }]) => ({
		activityType,
		count,
		total,
		avg: count ? total / count : 0
	}));

	//updating the spans with the information about the activities (top 3, longest, shortest, etc)
	const distinctActivities = rows.filter(r => r.activityType !== 'unknown');
	document.getElementById('numberActivities').innerText = distinctActivities.length;

	//top 3 by frequency
	const top3 = [...distinctActivities].sort((a, b) => b.count - a.count).slice(0, 3);
	document.getElementById('firstMost').innerText  = top3[0]?.activityType ?? '—';
	document.getElementById('secondMost').innerText = top3[1]?.activityType ?? '—';
	document.getElementById('thirdMost').innerText  = top3[2]?.activityType ?? '—';

	//among these three, longest/shortest by average distance
	const top3ByAvg = [...top3].sort((a, b) => b.avg - a.avg);
	const longest = top3ByAvg[0];
	const shortest = top3ByAvg[top3ByAvg.length - 1];
	document.getElementById('longestActivityType').innerText  = longest ? longest.activityType : '—';
	document.getElementById('shortestActivityType').innerText = shortest ? shortest.activityType : '—';

	//weekday vs weekend 
	const longestName = longest?.activityType;
	let sumWkdy = 0, nWkdy = 0, sumWknd = 0, nWknd = 0;
	if (longestName) {
		for (const t of completed) {
		if (t.activityType !== longestName) continue;
		const d = Number(t.distance) || 0;
		if (d <= 0) continue;
		const dt = t.time instanceof Date ? t.time : new Date(t.time || t.created_at);
		const day = dt.getDay(); // 0 Sun ... 6 Sat
		if (day === 0 || day === 6) { sumWknd += d; nWknd++; }
		else { sumWkdy += d; nWkdy++; }
		}
	}
	const avgWkdy = nWkdy ? sumWkdy / nWkdy : 0;
	const avgWknd = nWknd ? sumWknd / nWknd : 0;
	document.getElementById('weekdayOrWeekendLonger').innerText =
		avgWknd > avgWkdy ? 'weekends' : 'weekdays';

	activity_vis_spec = {
		$schema: "https://vega.github.io/schema/vega-lite/v5.json",
		description: "Number of Tweets containing each type of activity (completed events).",
		data: { values: completed },
		transform: [
			{ filter: "datum.activityType && datum.activityType !== 'unknown'" },
			{ aggregate: [{ op: "count", as: "Tweets" }], groupby: ["activityType"] },
			{ sort: [{ field: "Tweets", order: "descending" }] }
		],
		mark: "bar",
		encoding: {
			x: { field: "activityType", type: "nominal", sort: "-y", title: "Activity" },
			y: { field: "Tweets", type: "quantitative", title: "Tweets" },
			tooltip: [
			{ field: "activityType", type: "nominal", title: "Activity" },
			{ field: "Tweets", type: "quantitative" }
			]
		}
		};
	vegaEmbed('#activityVis', activity_vis_spec, {actions:false});

	//TODO: create the visualizations which group the three most-tweeted activities by the day of the week.
	//Use those visualizations to answer the questions about which activities tended to be longest and when.

	const topNames = top3.map(r => r.activityType);

	//one row per tweet with time and distance in miles
	const distancePoints = completed
	.filter(t => topNames.includes(t.activityType) && (Number(t.distance) || 0) > 0)
	.map(t => ({
		activityType: t.activityType,
		distance: Number(t.distance),
		time: (t.time instanceof Date) ? t.time : new Date(t.time || t.created_at)
	}));

	//distances by day of week 
	const rawSpec = {
	$schema: "https://vega.github.io/schema/vega-lite/v5.json",
	description: "Distances by day of week for the three most tweeted activities (raw points).",
	data: { values: distancePoints },
	mark: { type: "point", filled: false, opacity: 0.7 },
	encoding: {
		x: { timeUnit: "day", field: "time", type: "temporal", title: "time (day)", sort: "ascending" },
		y: { field: "distance", type: "quantitative", title: "distance" },
		color: { field: "activityType", type: "nominal", title: "activity" },
		tooltip: [
		{ field: "activityType", type: "nominal", title: "activity" },
		{ timeUnit: "day", field: "time", type: "temporal", title: "day" },
		{ field: "distance", type: "quantitative", title: "distance (mi)", format: ".2f" }
		]
	}
	};
	vegaEmbed('#distanceVis', rawSpec, { actions:false });

	//aggregated mean distance by day of week
	const aggSpec = {
	$schema: "https://vega.github.io/schema/vega-lite/v5.json",
	description: "Mean distance by day of week for the three most tweeted activities.",
	data: { values: distancePoints },
	transform: [
		{ timeUnit: "day", field: "time", as: "dow" },
		{ aggregate: [{ op: "mean", field: "distance", as: "meanDistance" }], groupby: ["activityType", "dow"] }
	],
	mark: { type: "point" },
	encoding: {
		x: { field: "dow", type: "temporal", title: "time (day)", sort: "ascending" },
		y: { field: "meanDistance", type: "quantitative", title: "Mean of distance" },
		color: { field: "activityType", type: "nominal", title: "activity" },
		tooltip: [
		{ field: "activityType", type: "nominal", title: "activity" },
		{ field: "meanDistance", type: "quantitative", title: "mean (mi)", format: ".2f" }
		]
	}
	};
	vegaEmbed('#distanceVisAggregated', aggSpec, { actions:false });

	//toggle button
	const btn = document.getElementById('aggregate');
	const rawDiv = document.getElementById('distanceVis');
	const aggDiv = document.getElementById('distanceVisAggregated');

	aggDiv.style.display = 'none';
	rawDiv.style.display = 'block';
	btn.textContent = 'Show means';

	btn.onclick = () => {
	const showMeans = aggDiv.style.display === 'none';
	aggDiv.style.display = showMeans ? 'block' : 'none';
	rawDiv.style.display = showMeans ? 'none' : 'block';
	btn.textContent = showMeans ? 'Show all activities' : 'Show means';
	};
}

//Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function (event) {
	loadSavedRunkeeperTweets().then(parseTweets);
});