    static let sample: [Exercise] = [
        ex("jumping-jacks", "Jumping Jacks", .warmup, .reps, 1, 30, p: [.calves, .shoulders], s: [.abductors],
           sym: "figure.mixed.cardio",
           sum: "Classic full-body heart-rate raiser.",
           steps: ["Stand tall, feet together.", "Jump feet wide while swinging arms overhead."],
           cues: ["Stay light", "Full arm range"],
           why: "Gets blood moving."),
        // A comment with ex("not-real", ...) inside it
        ex("skater-bound", "Skater Bound", .power, .reps, 3, 8, side: true, level: 2, p: [.glutes, .quads],
           eq: [.cones], tags: [.explosive, .gameDay],
           sum: "Leap side to side like a \"skater\", it's springy.",
           steps: ["Push off one leg."], cues: ["Stick it"], why: "Builds lateral power, 100%."),
    ]
