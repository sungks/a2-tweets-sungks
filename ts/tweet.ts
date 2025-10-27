class Tweet {
	private text:string;
	time:Date;

	constructor(tweet_text:string, tweet_time:string) {
        this.text = tweet_text;
		this.time = new Date(tweet_time);//, "ddd MMM D HH:mm:ss Z YYYY"
	}

	//returns either 'live_event', 'achievement', 'completed_event', or 'miscellaneous'
    get source():string {
        //TODO: identify whether the source is a live event, an achievement, a completed event, or miscellaneous.
        const textLower = this.text.toLowerCase();

        //completed events
        if(
            textLower.startsWith("just completed") ||
            textLower.startsWith("just posted") ||
            textLower.startsWith("just finished") ||
            textLower.includes("finished") ||
            textLower.includes("completed") ||
            textLower.includes("posted") 
        ){
            return "completed_event";
        }

        //live events
        if (
        (textLower.startsWith("watch")) &&
        (textLower.includes("with #runkeeper") || textLower.includes("with @runkeeper") ||
         textLower.includes("right now") || textLower.includes("currently") || textLower.includes("live"))
        ) {
            return "live_event";
        }

        //achievements
        if(
            textLower.includes("goal") ||
            textLower.includes("personal record") ||
            textLower.includes("new pr") ||
            textLower.includes("achievement") ||
            textLower.includes("personal best") ||
            textLower.includes("fastest") ||
            textLower.includes("longest")
        ){
            return "achievement";
        }
        
        return "miscellaneous";
    }

    //returns a boolean, whether the text includes any content written by the person tweeting.
    get written():boolean {
        //TODO: identify whether the tweet is written
        let t = (this.text || "").toLowerCase();

        //remove hashtag and links
        t = t.replace(/#runkeeper/gi, "");
        t = t.replace(/https?:\/\/\S+/gi, "");

        //remove common phrases
        const boilerplate = [
            "just completed", "just posted", "just finished",
            "with @runkeeper", "with #runkeeper", "with runkeeper",
            "using @runkeeper", "using #runkeeper", "using runkeeper",
            "via @runkeeper", "on @runkeeper", "check it out", "check this out"
        ];
        for (const p of boilerplate) t = t.replace(new RegExp("\\b" + p + "\\b", "g"), "");

        //remove stats
        t = t.replace(/\b(distance|time|pace|duration|calories|elevation|avg pace|average pace|avg speed|average speed)\b/gi, "");

        //remove numbers
        t = t.replace(/\b[\d:.]+(?:\s?(mi|mile|miles|km|kilometer|kilometers|m|km\/h|mph|min|sec|s|h))?\b/gi, "");

        //remove activity nouns
        t = t.replace(/\b(run|jog|walk|hike|bike|biking|cycle|cycling|ride|workout|session|race|elliptical|treadmill|yoga)\b/gi, "");

        //remove separators/punctuation and spaces
        t = t.replace(/[-–—•|,;:()]+/g, " ");
        t = t.replace(/\s+/g, " ").trim();

        //check for written words
        const words = t.split(" ").filter(w => /^[a-z][a-z']{2,}$/.test(w));
        return words.length > 0;
    }

    get writtenText():string {
        if(!this.written) {
            return "";
        }
        //TODO: parse the written text from the tweet
        let text = this.text;
        text = text.replace(/#RunKeeper/gi, "");
        text = text.replace(/https?:\/\/\S+/gi, "");

        const autoPhrases = [
            "just completed",
            "just posted",
            "with @runkeeper",
            "with runkeeper",
            "check it out",
            "using @runkeeper",
            "distance",
            "time",
            "pace"
        ];

        for (const phrase of autoPhrases) {
            const regex = new RegExp(phrase, "gi");
            text = text.replace(regex, "");
        }

        text = text.trim();
        if (text.length > 0) {
            text = text[0].toUpperCase() + text.slice(1);
        }
        return text;
    }

    get activityType():string {
        if (this.source != 'completed_event') {
            return "unknown";
        }
        let t = (this.text || "").toLowerCase();

        t = t.replace(/#runkeeper/gi, "").replace(/https?:\/\/\S+/gi, "").trim();

        const afterDistance = t.match(
            /(\d+(?:[.,]\d+)?)(?:\s*)?(mi|miles?|km|kilometers?|k)\s*(?:of\s+)?([a-z][a-z\s'-]+?)(?:[—–-]|via|with|on|using|$)/i
        );
        if (afterDistance && afterDistance[3]) {
            return this.normalizeActivityName(afterDistance[3]);
        }

        const afterVerb = t.match(/(?:just\s+)?(?:completed|posted|finished)\s+(?:an?\s+)?([a-z][a-z\s'-]+?)(?:[—–-]|$)/i);
        if (afterVerb && afterVerb[1]) {
            return this.normalizeActivityName(afterVerb[1]);
        }

        //fall back: keyword scan
        const keywords = [
            "running","run","walking","walk","cycling","cycle","bike","ride",
            "hike","hiking","swimming","swim","rowing","row","kayak","kayaking",
            "snowboard","snowboarding","yoga","pilates","elliptical","treadmill",
            "strength","weights","crossfit","spin","spinning"
        ];
        for (const k of keywords) if (t.includes(k)) return this.normalizeActivityName(k);

        return "unknown";
    }

    //helper function to make word forms one type
    private normalizeActivityName(raw: string): string {
        const s = raw.trim().toLowerCase();

        if (/\brun(ning)?|trail run|jog(ging)?\b/.test(s)) return "Run";
        if (/\bwalk(ing)?\b/.test(s)) return "Walk";
        if (/\b(bike|biking|cycle|cycling|ride|spin|spinning)\b/.test(s)) return "Cycle";
        if (/\bhike|hiking\b/.test(s)) return "Hike";
        if (/\bswim(ming)?\b/.test(s)) return "Swim";
        if (/\brow(ing)?\b/.test(s)) return "Row";
        if (/\bkayak(ing)?\b/.test(s)) return "Kayak";
        if (/\bsnowboard(ing)?\b/.test(s)) return "Snowboard";
        if (/\btreadmill\b/.test(s)) return "Treadmill";
        if (/\belliptical\b/.test(s)) return "Elliptical";
        if (/\byoga\b/.test(s)) return "Yoga";
        if (/\b(pilates)\b/.test(s)) return "Pilates";
        if (/\b(strength|weights?|crossfit)\b/.test(s)) return "Strength Training";

        // fallback: capitalize the raw text
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    get distance():number {
        if (this.source !== "completed_event") return 0;

        let t = (this.text || "").toLowerCase();
        t = t.replace(/#runkeeper/gi, "").replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim();

        // Ignore times like 00:32:10 by requiring a unit or a race keyword
        // 1) number + optional space + unit (mi/mile/km/kilometer/k)  e.g., "6.2mi", "6.2 mi", "5k", "10km"
        const m1 = t.match(/(\d+(?:[.,]\d+)?)(?:\s*)?(mi|miles?|km|kilometers?|k)\b/i);
        if (m1) {
            const val = parseFloat(m1[1].replace(",", "."));
            const unit = m1[2].toLowerCase();
            if (/^mi|mile/.test(unit)) return val;
            // treat both "km" and bare "k" as kilometers
            if (unit === "k" || unit.startsWith("km") || unit.startsWith("kilometer")) return val / 1.609;
        }

        //named race distances (ex: marathon, half marathon)
        // half marathon ≈ 13.1 mi, marathon ≈ 26.2 mi
        if (/\bhalf\s+marathon\b/.test(t)) return 13.1;
        if (/\bmarathon\b/.test(t)) return 26.2;
        if (/\b5k\b/.test(t)) return 5 / 1.609;
        if (/\b10k\b/.test(t)) return 10 / 1.609;
        if (/\b15k\b/.test(t)) return 15 / 1.609;
        if (/\b20k\b/.test(t)) return 20 / 1.609;
        if (/\b50k\b/.test(t)) return 50 / 1.609;

        return 0; 
    }

    getHTMLTableRow(rowNumber:number):string {
        //TODO: return a table row which summarizes the tweet with a clickable link to the RunKeeper activity
         const activity = this.activityType || "unknown";

        // Escape HTML to avoid breaking the table
        const escapeHtml = (s: string) =>
            s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        const raw = this.text || "";
        
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const escaped = escapeHtml(raw);
        const htmlWithLinks = escaped.replace(
            urlRegex,
            (m) => `<a href="${m}" target="_blank" rel="noopener noreferrer">${m}</a>`
        );

        const displayText = htmlWithLinks.replace(/#runkeeper\b/gi, "");

        return (
            `<tr>` +
            `<td>${rowNumber}</td>` +
            `<td>${escapeHtml(activity)}</td>` +
            `<td>${displayText}</td>` +
            `</tr>`
        );
    }
}