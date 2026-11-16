#!/usr/bin/env python3
"""Enrich every Notes lesson page with rigorous SEO head + on-page signals."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NOTES = ROOT / "src" / "pages" / "notes"
SITE = "https://fatjonrrapaj.dev"
MODIFIED = "2026-11-15"

LESSONS = [
    {
        "slug": "js-arrays-objects-for-loops",
        "file": "js-arrays-objects-for-loops.html",
        "lang": "en",
        "locale": "en_US",
        "track": "javascript",
        "track_label": "JavaScript",
        "track_hash": "#javascript",
        "section": "JavaScript",
        "name": "JS Arrays, Objects & For Loops",
        "title": "JS Arrays, Objects & For Loops — Learn JavaScript | Fatjon Rrapaj Notes",
        "description": "Free JavaScript lesson: arrays, objects, and for loops — index access, fill empty collections, arrays of objects, sum and average. Teaching notes by Fatjon Rrapaj (Tirana).",
        "og_description": "JavaScript arrays, objects, and for loops with runnable examples — access, fill, traverse, and compute averages.",
        "published": "2023-02-02",
        "time_required": "PT25M",
        "image": f"{SITE}/notes/javascript.png",
        "image_w": 870,
        "image_h": 664,
        "image_alt": "JavaScript teaching notes cover — arrays, objects, and loops",
        "keywords": [
            "JavaScript arrays",
            "JavaScript objects",
            "for loops",
            "array of objects",
            "JavaScript tutorial",
            "learn JavaScript",
        ],
        "teaches": [
            "JavaScript arrays",
            "JavaScript objects",
            "For loops",
            "Array indexing",
            "Array of objects",
            "Sum and average with loops",
        ],
        "about": ["ECMAScript", "Data structures", "Programming fundamentals"],
        "educational_level": "Beginner",
    },
    {
        "slug": "js-event-listeners",
        "file": "js-event-listeners.html",
        "lang": "en",
        "locale": "en_US",
        "track": "javascript",
        "track_label": "JavaScript",
        "track_hash": "#javascript",
        "section": "JavaScript",
        "name": "JavaScript Event Listeners",
        "title": "JavaScript Event Listeners & CSS Animations — Fatjon Rrapaj Notes",
        "description": "Learn JavaScript event listeners: onclick, onmouseover, onkeydown, form submit, and controlling CSS keyframe animations with getAnimations(). Free teaching notes by Fatjon Rrapaj.",
        "og_description": "Event listeners and CSS animations — respond to clicks, hover, keys, and control keyframe animations with JS.",
        "published": "2023-02-07",
        "time_required": "PT30M",
        "image": f"{SITE}/notes/javascript.png",
        "image_w": 870,
        "image_h": 664,
        "image_alt": "JavaScript teaching notes cover — event listeners",
        "keywords": [
            "JavaScript event listeners",
            "onclick",
            "onmouseover",
            "onkeydown",
            "CSS animations JavaScript",
            "getAnimations",
        ],
        "teaches": [
            "JavaScript event listeners",
            "onclick",
            "onmouseover",
            "onkeydown",
            "CSS animations",
            "CSS keyframes",
            "animation-play-state",
        ],
        "about": ["DOM events", "Web interactivity", "CSS Animation"],
        "educational_level": "Beginner",
    },
    {
        "slug": "js-interactions-html-forms",
        "file": "js-interactions-html-forms.html",
        "lang": "en",
        "locale": "en_US",
        "track": "javascript",
        "track_label": "JavaScript",
        "track_hash": "#javascript",
        "section": "JavaScript",
        "name": "Introduction to JavaScript Interactions with HTML Forms",
        "title": "JavaScript Form Validation & HTML Forms — Fatjon Rrapaj Notes",
        "description": "JavaScript interactions with HTML forms: getElementById, submit preventDefault, and validate name, email, and password fields. Free lesson notes by Fatjon Rrapaj.",
        "og_description": "Form validation, capturing submit, and reading field values with JavaScript — name, email, password examples.",
        "published": "2023-02-09",
        "time_required": "PT35M",
        "image": f"{SITE}/notes/javascript.png",
        "image_w": 870,
        "image_h": 664,
        "image_alt": "JavaScript teaching notes cover — HTML forms",
        "keywords": [
            "JavaScript form validation",
            "HTML forms JavaScript",
            "preventDefault",
            "addEventListener submit",
            "password validation regex",
        ],
        "teaches": [
            "HTML forms",
            "Form validation",
            "addEventListener submit",
            "preventDefault",
            "getElementById",
            "Password regex validation",
        ],
        "about": ["Web forms", "Client-side validation", "DOM"],
        "educational_level": "Beginner",
    },
    {
        "slug": "css-box-model",
        "file": "css-box-model.html",
        "lang": "sq",
        "locale": "sq_AL",
        "track": "css",
        "track_label": "CSS",
        "track_hash": "#css",
        "section": "CSS",
        "name": "CSS Box Model",
        "title": "CSS Box Model (Shqip) — Padding, Border, Margin | Fatjon Rrapaj Notes",
        "description": "Mësoni CSS Box Model në shqip: content, padding, border dhe margin — sintaksë e plotë dhe e shkurtuar. Shënime falas nga Fatjon Rrapaj, kurs në Tiranë.",
        "og_description": "CSS Box Model në shqip — kuti që mbështjell përmbajtjen me padding, border dhe margin, me shembuj dhe CodeSandbox.",
        "published": "2022-12-27",
        "time_required": "PT20M",
        "image": f"{SITE}/notes/css-box-model/box-model-overview.png",
        "image_w": 1400,
        "image_h": 726,
        "image_alt": "Diagramë e CSS Box Model — content, padding, border, margin",
        "keywords": [
            "CSS Box Model",
            "CSS padding",
            "CSS margin",
            "CSS border",
            "CSS shqip",
            "mëso CSS",
        ],
        "teaches": [
            "CSS Box Model",
            "border",
            "padding",
            "margin",
            "CSS shorthand",
            "border-style",
        ],
        "about": ["CSS layout", "Web design fundamentals"],
        "educational_level": "Beginner",
    },
    {
        "slug": "css-flexbox",
        "file": "css-flexbox.html",
        "lang": "sq",
        "locale": "sq_AL",
        "track": "css",
        "track_label": "CSS",
        "track_hash": "#css",
        "section": "CSS",
        "name": "CSS Flexbox",
        "title": "CSS Flexbox (Shqip) — display:flex, justify-content | Fatjon Rrapaj Notes",
        "description": "CSS Flexbox në shqip: display:flex, flex-direction, flex, justify-content, align-items, align-self dhe flex-wrap. Shënime mësimore falas nga Fatjon Rrapaj.",
        "og_description": "Flexbox — orientimi i elementeve në rresht ose kolonë, flex grow, justify-content, align-items dhe flex-wrap.",
        "published": "2023-01-08",
        "time_required": "PT30M",
        "image": f"{SITE}/notes/css.png",
        "image_w": 1212,
        "image_h": 810,
        "image_alt": "CSS teaching notes cover — Flexbox",
        "keywords": [
            "CSS Flexbox",
            "display flex",
            "justify-content",
            "align-items",
            "flex-wrap",
            "CSS shqip",
        ],
        "teaches": [
            "CSS Flexbox",
            "display flex",
            "flex-direction",
            "justify-content",
            "align-items",
            "align-self",
            "flex-wrap",
        ],
        "about": ["CSS layout", "Responsive design"],
        "educational_level": "Beginner",
    },
    {
        "slug": "css-element-positioning",
        "file": "css-element-positioning.html",
        "lang": "sq",
        "locale": "sq_AL",
        "track": "css",
        "track_label": "CSS",
        "track_hash": "#css",
        "section": "CSS",
        "name": "CSS Element Positioning",
        "title": "CSS Position (Shqip) — Absolute, Fixed, Relative, Sticky | Fatjon Rrapaj Notes",
        "description": "CSS positioning në shqip: absolute, fixed, relative, sticky dhe static — me shembuj HTML/CSS dhe CodeSandbox. Shënime falas nga Fatjon Rrapaj.",
        "og_description": "Pesë lloje pozicionimi në CSS — absolute, fixed, relative, sticky dhe static, me shembuj praktikë.",
        "published": "2023-01-08",
        "time_required": "PT30M",
        "image": f"{SITE}/notes/css.png",
        "image_w": 1212,
        "image_h": 810,
        "image_alt": "CSS teaching notes cover — element positioning",
        "keywords": [
            "CSS position absolute",
            "CSS position fixed",
            "CSS position sticky",
            "CSS relative",
            "CSS positioning",
            "CSS shqip",
        ],
        "teaches": [
            "CSS position",
            "absolute",
            "fixed",
            "relative",
            "sticky",
            "static",
            "top left right bottom",
        ],
        "about": ["CSS layout", "Document flow"],
        "educational_level": "Beginner",
    },
    {
        "slug": "hyrje-ne-html",
        "file": "hyrje-ne-html.html",
        "lang": "sq",
        "locale": "sq_AL",
        "track": "html",
        "track_label": "HTML",
        "track_hash": "#html",
        "section": "HTML",
        "name": "Hyrje në HTML",
        "title": "Hyrje në HTML (Shqip) — Tags, Links, Images | Fatjon Rrapaj Notes",
        "description": "Hyrje në HTML në shqip: çfarë është HTML, taget, head, body, title, headings, paragrafë, linke, imazhe dhe atribute. Shënime falas nga Fatjon Rrapaj.",
        "og_description": "HTML — Hypertext Markup Language. Taget, head, body, linket, imazhet dhe atributet, me shembuj.",
        "published": "2022-12-18",
        "time_required": "PT25M",
        "image": f"{SITE}/notes/html.png",
        "image_w": 1204,
        "image_h": 1068,
        "image_alt": "HTML teaching notes cover — introduction to markup",
        "keywords": [
            "Hyrje në HTML",
            "HTML tags",
            "HTML atribute",
            "mëso HTML shqip",
            "HTML tutorial Albanian",
        ],
        "teaches": [
            "HTML",
            "HTML tags",
            "HTML attributes",
            "Anchor links",
            "img",
            "Document structure",
        ],
        "about": ["HTML5", "Web markup", "Browser rendering"],
        "educational_level": "Beginner",
    },
    {
        "slug": "html-tables",
        "file": "html-tables.html",
        "lang": "sq",
        "locale": "sq_AL",
        "track": "html",
        "track_label": "HTML",
        "track_hash": "#html",
        "section": "HTML",
        "name": "HTML Tables",
        "title": "HTML Tables (Shqip) — table, thead, tbody, th, td | Fatjon Rrapaj Notes",
        "description": "HTML tables në shqip: table, thead, tbody, tr, th dhe td, plus stilizim me CSS. Shënime mësimore falas nga Fatjon Rrapaj.",
        "og_description": "Tabelat në HTML — table, thead, tbody, tr, th, td dhe stilizim me CSS, me CodeSandbox.",
        "published": "2023-01-14",
        "time_required": "PT20M",
        "image": f"{SITE}/notes/html.png",
        "image_w": 1204,
        "image_h": 1068,
        "image_alt": "HTML teaching notes cover — tables",
        "keywords": [
            "HTML tables",
            "thead tbody",
            "HTML th td",
            "tabela HTML",
            "HTML shqip",
        ],
        "teaches": [
            "HTML tables",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
            "Table CSS styling",
        ],
        "about": ["HTML5", "Tabular data"],
        "educational_level": "Beginner",
    },
    {
        "slug": "html-forms-and-form-elements",
        "file": "html-forms-and-form-elements.html",
        "lang": "en",
        "locale": "en_US",
        "track": "html",
        "track_label": "HTML",
        "track_hash": "#html",
        "section": "HTML",
        "name": "Understanding HTML Forms and Form Elements",
        "title": "HTML Forms & Form Elements — text, radio, select, checkbox | Fatjon Rrapaj Notes",
        "description": "HTML form elements explained: text, password, date, tel, number, radio buttons, select, checkboxes, and submit/reset buttons. Free teaching notes by Fatjon Rrapaj.",
        "og_description": "HTML form elements — text, password, date, tel, number, radio, select, checkbox, and buttons with examples.",
        "published": "2023-02-09",
        "time_required": "PT30M",
        "image": f"{SITE}/notes/html.png",
        "image_w": 1204,
        "image_h": 1068,
        "image_alt": "HTML teaching notes cover — forms and form elements",
        "keywords": [
            "HTML forms",
            "input type text",
            "HTML radio button",
            "HTML select",
            "HTML checkbox",
            "form elements tutorial",
        ],
        "teaches": [
            "HTML forms",
            "input types",
            "radio buttons",
            "select",
            "checkbox",
            "form buttons",
            "label for attribute",
        ],
        "about": ["HTML5 forms", "User input", "Accessibility labels"],
        "educational_level": "Beginner",
    },
    {
        "slug": "hyrje-ne-react",
        "file": "hyrje-ne-react.html",
        "lang": "sq",
        "locale": "sq_AL",
        "track": "react",
        "track_label": "React",
        "track_hash": "#react",
        "section": "React",
        "name": "Hyrje në React",
        "title": "Hyrje në React (Shqip) — Components, DOM, JSX | Fatjon Rrapaj Notes",
        "description": "Hyrje në React në shqip: librari vs framework, komponentë, DOM nodes vs elements, JSX dhe ReactDOM.createRoot. Shënime falas nga Fatjon Rrapaj.",
        "og_description": "React — librari për User Interface, komponentë, DOM, JSX dhe props. Hyrje në shqip.",
        "published": "2022-09-03",
        "time_required": "PT35M",
        "image": f"{SITE}/notes/react.png",
        "image_w": 1200,
        "image_h": 798,
        "image_alt": "React teaching notes cover — introduction to React",
        "keywords": [
            "Hyrje në React",
            "React shqip",
            "React components",
            "React DOM",
            "JSX introduction",
            "mëso React",
        ],
        "teaches": [
            "React",
            "React components",
            "JSX",
            "DOM",
            "props",
            "ReactDOM.createRoot",
            "Library vs framework",
        ],
        "about": ["React", "Frontend frameworks", "User interface"],
        "educational_level": "Beginner",
    },
    {
        "slug": "jsx",
        "file": "jsx.html",
        "lang": "sq",
        "locale": "sq_AL",
        "track": "react",
        "track_label": "React",
        "track_hash": "#react",
        "section": "React",
        "name": "JSX",
        "title": "JSX (Shqip) — JavaScript XML in React | Fatjon Rrapaj Notes",
        "description": "JSX në shqip: JavaScript XML, shprehje në {}, funksione, if/else, stilim inline dhe komponentë si elemente. Shënime mësimore falas nga Fatjon Rrapaj.",
        "og_description": "JSX — JavaScript XML. Shkruaj elementë HTML në JavaScript dhe vendosi në DOM me React.",
        "published": "2022-09-06",
        "time_required": "PT20M",
        "image": f"{SITE}/notes/react.png",
        "image_w": 1200,
        "image_h": 798,
        "image_alt": "React teaching notes cover — JSX",
        "keywords": [
            "JSX",
            "JavaScript XML",
            "React JSX",
            "JSX expressions",
            "JSX shqip",
        ],
        "teaches": [
            "JSX",
            "React components",
            "JavaScript expressions in JSX",
            "inline styles in JSX",
            "Embedding components",
        ],
        "about": ["React", "JSX syntax", "Babel"],
        "educational_level": "Beginner",
    },
    {
        "slug": "react-useeffect-hook",
        "file": "react-useeffect-hook.html",
        "lang": "sq",
        "locale": "sq_AL",
        "track": "react",
        "track_label": "React",
        "track_hash": "#react",
        "section": "React",
        "name": "React useEffect hook",
        "title": "React useEffect Hook (Shqip) — Side Effects & Cleanup | Fatjon Rrapaj Notes",
        "description": "React useEffect në shqip: side effects vs pure functions, dependency array, cleanup, dhe event listeners. Shënime falas nga Fatjon Rrapaj me CodeSandbox.",
        "og_description": "useEffect për side effects — mounting, dependencies, cleanup dhe event listeners. Mësim në shqip.",
        "published": "2022-09-28",
        "time_required": "PT40M",
        "image": f"{SITE}/notes/react.png",
        "image_w": 1200,
        "image_h": 798,
        "image_alt": "React teaching notes cover — useEffect hook",
        "keywords": [
            "React useEffect",
            "useEffect dependency array",
            "useEffect cleanup",
            "React side effects",
            "useEffect shqip",
        ],
        "teaches": [
            "React useEffect",
            "side effects",
            "dependency array",
            "cleanup function",
            "event listeners",
            "useState with useEffect",
        ],
        "about": ["React Hooks", "Functional programming", "Browser APIs"],
        "educational_level": "Beginner",
    },
]

BY_SLUG = {l["slug"]: l for l in LESSONS}
BY_TRACK: dict[str, list] = {}
for lesson in LESSONS:
    BY_TRACK.setdefault(lesson["track"], []).append(lesson)


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def related_for(lesson: dict) -> list:
    track = BY_TRACK[lesson["track"]]
    return [x for x in track if x["slug"] != lesson["slug"]]


def build_json_ld(lesson: dict) -> str:
    url = f"{SITE}/notes/{lesson['file']}"
    related = related_for(lesson)
    graph = [
        {
            "@type": "WebPage",
            "@id": f"{url}#webpage",
            "url": url,
            "name": lesson["title"],
            "description": lesson["description"],
            "inLanguage": lesson["lang"],
            "isPartOf": {"@id": f"{SITE}/#website"},
            "about": {"@id": f"{url}#lesson"},
            "primaryImageOfPage": {"@id": f"{url}#primaryimage"},
            "breadcrumb": {"@id": f"{url}#breadcrumb"},
            "author": {"@id": f"{SITE}/#person"},
            "publisher": {"@id": f"{SITE}/#person"},
            "datePublished": lesson["published"],
            "dateModified": MODIFIED,
            "isAccessibleForFree": True,
            "speakable": {
                "@type": "SpeakableSpecification",
                "cssSelector": [".lesson-hero h1", ".lesson-hero .lead", ".lesson-body h2"],
            },
            "potentialAction": {
                "@type": "ReadAction",
                "target": url,
            },
        },
        {
            "@type": ["LearningResource", "Article", "TechArticle"],
            "@id": f"{url}#lesson",
            "url": url,
            "name": lesson["name"],
            "headline": lesson["name"],
            "description": lesson["description"],
            "datePublished": lesson["published"],
            "dateModified": MODIFIED,
            "inLanguage": lesson["lang"],
            "isAccessibleForFree": True,
            "learningResourceType": ["Lesson", "Tutorial"],
            "educationalLevel": lesson["educational_level"],
            "timeRequired": lesson["time_required"],
            "keywords": lesson["keywords"],
            "teaches": lesson["teaches"],
            "about": lesson["about"],
            "articleSection": lesson["section"],
            "author": {"@id": f"{SITE}/#person"},
            "creator": {"@id": f"{SITE}/#person"},
            "provider": {"@id": f"{SITE}/#person"},
            "publisher": {"@id": f"{SITE}/#person"},
            "image": {"@id": f"{url}#primaryimage"},
            "thumbnailUrl": lesson["image"],
            "mainEntityOfPage": {"@id": f"{url}#webpage"},
            "isPartOf": {
                "@type": "Course",
                "@id": f"{SITE}/blog.html#course",
                "name": "HTML, CSS, JavaScript & React — teaching notes",
                "url": f"{SITE}/blog.html",
            },
            "educationalAlignment": {
                "@type": "AlignmentObject",
                "alignmentType": "educationalSubject",
                "targetName": lesson["section"],
            },
            "audience": {
                "@type": "EducationalAudience",
                "educationalRole": "student",
                "audienceType": "Beginner web developers",
            },
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock",
            },
        },
        {
            "@type": "ImageObject",
            "@id": f"{url}#primaryimage",
            "url": lesson["image"],
            "contentUrl": lesson["image"],
            "width": lesson["image_w"],
            "height": lesson["image_h"],
            "caption": lesson["image_alt"],
            "inLanguage": lesson["lang"],
        },
        {
            "@type": "BreadcrumbList",
            "@id": f"{url}#breadcrumb",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": f"{SITE}/",
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Notes",
                    "item": f"{SITE}/blog.html",
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": lesson["track_label"],
                    "item": f"{SITE}/blog.html{lesson['track_hash']}",
                },
                {
                    "@type": "ListItem",
                    "position": 4,
                    "name": lesson["name"],
                    "item": url,
                },
            ],
        },
    ]
    if related:
        graph[1]["relatedLink"] = [
            f"{SITE}/notes/{r['file']}" for r in related
        ]
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2)


def build_head_seo(lesson: dict) -> str:
    url = f"{SITE}/notes/{lesson['file']}"
    tags = "\n".join(
        f'    <meta property="article:tag" content="{esc(t)}" />'
        for t in lesson["teaches"]
    )
    kw = esc(", ".join(lesson["keywords"]))
    hreflang = ""
    if lesson["lang"] == "sq":
        hreflang = f"""    <link
      rel="alternate"
      hreflang="sq"
      href="{url}"
    />
    <link
      rel="alternate"
      hreflang="x-default"
      href="{SITE}/blog.html"
    />
"""
    else:
        hreflang = f"""    <link
      rel="alternate"
      hreflang="en"
      href="{url}"
    />
    <link
      rel="alternate"
      hreflang="x-default"
      href="{url}"
    />
"""

    og_locale_alt = (
        '    <meta property="og:locale:alternate" content="en_US" />\n'
        if lesson["lang"] == "sq"
        else '    <meta property="og:locale:alternate" content="sq_AL" />\n'
    )

    json_ld = build_json_ld(lesson)
    # indent JSON for script body
    json_ld_indented = "\n".join("      " + line if line else line for line in json_ld.splitlines())

    return f"""    <title>{esc(lesson["title"])}</title>
    <meta
      name="description"
      content="{esc(lesson["description"])}"
    />
    <meta
      name="robots"
      content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    />
    <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="author" content="Fatjon Rrapaj" />
    <meta name="creator" content="Fatjon Rrapaj" />
    <meta name="publisher" content="Fatjon Rrapaj" />
    <meta name="theme-color" content="#eef8f6" />
    <meta name="keywords" content="{kw}" />
    <meta name="language" content="{lesson["lang"]}" />
    <meta name="geo.region" content="AL-11" />
    <meta name="geo.placename" content="Tirana" />
    <link
      rel="canonical"
      href="{url}"
    />
{hreflang}    <link rel="icon" href="/favicon.png?v=5" type="image/png" sizes="32x32" />
    <link rel="icon" href="/favicon.svg?v=5" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=5" />
    <link rel="manifest" href="/site.webmanifest" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Fatjon Rrapaj" />
    <meta property="og:locale" content="{lesson["locale"]}" />
{og_locale_alt}    <meta
      property="og:url"
      content="{url}"
    />
    <meta
      property="og:title"
      content="{esc(lesson["title"])}"
    />
    <meta
      property="og:description"
      content="{esc(lesson["og_description"])}"
    />
    <meta property="og:image" content="{lesson["image"]}" />
    <meta property="og:image:secure_url" content="{lesson["image"]}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="{lesson["image_w"]}" />
    <meta property="og:image:height" content="{lesson["image_h"]}" />
    <meta property="og:image:alt" content="{esc(lesson["image_alt"])}" />
    <meta property="article:published_time" content="{lesson["published"]}" />
    <meta property="article:modified_time" content="{MODIFIED}" />
    <meta property="article:author" content="Fatjon Rrapaj" />
    <meta property="article:section" content="{esc(lesson["section"])}" />
{tags}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{esc(lesson["title"])}" />
    <meta
      name="twitter:description"
      content="{esc(lesson["og_description"])}"
    />
    <meta name="twitter:image" content="{lesson["image"]}" />
    <meta name="twitter:image:alt" content="{esc(lesson["image_alt"])}" />

    <meta name="format-detection" content="telephone=no" />
    <link rel="sitemap" type="application/xml" href="/sitemap.xml" />

    <script type="application/ld+json">
{json_ld_indented}
    </script>"""


def build_breadcrumb(lesson: dict) -> str:
    return f"""        <nav class="lesson-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><a href="/">Home</a></li>
            <li><a href="/blog.html">Notes</a></li>
            <li><a href="/blog.html{lesson["track_hash"]}">{esc(lesson["track_label"])}</a></li>
            <li aria-current="page">{esc(lesson["name"])}</li>
          </ol>
        </nav>
"""


def build_related(lesson: dict) -> str:
    related = related_for(lesson)
    if not related:
        return ""
    items = []
    for r in related:
        items.append(
            f"""          <li>
            <a href="/notes/{r["file"]}" hreflang="{r["lang"]}"
              >{esc(r["name"])}</a
            >
          </li>"""
        )
    return f"""
        <aside class="lesson-related" aria-labelledby="lesson-related-title">
          <h2 id="lesson-related-title">More in {esc(lesson["track_label"])}</h2>
          <ul>
{chr(10).join(items)}
          </ul>
          <p class="lesson-related__all">
            <a href="/blog.html{lesson["track_hash"]}">All {esc(lesson["track_label"])} notes →</a>
          </p>
        </aside>
"""


# Matches the SEO head block produced by this script (title → JSON-LD).
# Fonts / FOUC critical CSS must remain after this block.
HEAD_RE = re.compile(
    r"    <title>.*?</title>.*?    <script type=\"application/ld\+json\">.*?</script>",
    re.DOTALL,
)

# Remove existing breadcrumb / related if re-run
BREADCRUMB_RE = re.compile(
    r"\n        <nav class=\"lesson-breadcrumb\".*?</nav>\n",
    re.DOTALL,
)
RELATED_RE = re.compile(
    r"\n        <aside class=\"lesson-related\".*?</aside>\n",
    re.DOTALL,
)


def enrich_file(lesson: dict) -> None:
    path = NOTES / lesson["file"]
    text = path.read_text()

    # Ensure html lang
    text = re.sub(
        r"<html[^>]*>",
        f'<html lang="{lesson["lang"]}">',
        text,
        count=1,
    )

    new_head = build_head_seo(lesson)
    if not HEAD_RE.search(text):
        raise SystemExit(f"Head pattern not found: {path.name}")
    text = HEAD_RE.sub(new_head, text, count=1)

    text = BREADCRUMB_RE.sub("\n", text)
    text = RELATED_RE.sub("\n", text)

    crumb = build_breadcrumb(lesson)
    if '<article class="lesson">' in text and "lesson-breadcrumb" not in text:
        text = text.replace(
            '<article class="lesson">\n',
            f'<article class="lesson" itemscope itemtype="https://schema.org/LearningResource">\n{crumb}',
            1,
        )
    elif "lesson-breadcrumb" not in text:
        text = text.replace(
            "<article class=\"lesson\">",
            f'<article class="lesson" itemscope itemtype="https://schema.org/LearningResource">\n{crumb.rstrip()}',
            1,
        )

    # microdata on title / description if not present
    if "itemprop=\"headline\"" not in text:
        text = re.sub(
            r'(<h1 class="hero-brand reveal"[^>]*>)\s*',
            r'\1<span itemprop="headline">',
            text,
            count=1,
        )
        # close span before </h1> — careful with multiline
        text = re.sub(
            r'(<h1 class="hero-brand reveal"[^>]*>\s*<span itemprop="headline">)(.*?)(</h1>)',
            r"\1\2</span>\3",
            text,
            count=1,
            flags=re.DOTALL,
        )

    if 'itemprop="description"' not in text:
        text = re.sub(
            r'(<p class="lead reveal">)',
            r'<p class="lead reveal" itemprop="description">',
            text,
            count=1,
        )

    if 'itemprop="datePublished"' not in text:
        text = re.sub(
            r'<time datetime="([^"]+)">',
            r'<time datetime="\1" itemprop="datePublished">',
            text,
            count=1,
        )

    related = build_related(lesson)
    if related and "lesson-related" not in text:
        text = text.replace(
            "      </article>",
            f"{related}      </article>",
            1,
        )

    path.write_text(text)
    print("enriched", path.name)


def main() -> None:
    for lesson in LESSONS:
        enrich_file(lesson)


if __name__ == "__main__":
    main()
