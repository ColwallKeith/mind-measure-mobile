import { useState } from 'react';
import { ArticleDetailPage } from './ArticleDetailPage';

interface ContentArticle {
  id: string;
  category: 'Anxiety' | 'Sleep' | 'Stress' | 'Relationships' | 'Exercise' | 'Study';
  title: string;
  description: string;
  readTime: number;
  isNew?: boolean;
  thumbnail: string;
  fullContent: string;
  author?: string;
  publishDate?: string;
}

interface ContentPageProps {
  universityName?: string;
  universityLogo?: string;
}

export function ContentPage({
  universityName = 'University of Worcester',
  universityLogo
}: ContentPageProps) {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [selectedArticle, setSelectedArticle] = useState<ContentArticle | null>(null);

  // Mock data - will be replaced by CMS content
  const articles: ContentArticle[] = [
    {
      id: '1',
      category: 'Anxiety',
      title: 'The 5-4-3-2-1 Grounding Technique',
      description: 'When feeling overwhelmed, use your senses to anchor yourself. This technique helps bring you back to the present moment.',
      readTime: 3,
      isNew: true,
      thumbnail: 'https://images.unsplash.com/photo-1758797316117-8d133af25f8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwbWVkaXRhdGlvbiUyMGNhbG18ZW58MXx8fHwxNzY3NzM2MjE3fDA&ixlib=rb-4.1.0&q=80&w=1080',
      author: 'Dr Sarah Mitchell, Clinical Psychologist',
      publishDate: '4 January 2026',
      fullContent: `Grounding techniques are powerful tools for managing anxiety and overwhelming emotions. The 5-4-3-2-1 technique is one of the most accessible and effective methods you can use anywhere, anytime.

How it works:

The technique engages all five senses to bring your attention to the present moment, interrupting anxious thoughts and physical symptoms of stress.

Step 1: Acknowledge FIVE things you see
Look around and name five things you can see. They can be anything - a pen on the desk, a crack in the ceiling, the pattern on someone's shirt. The key is to really look and notice details you might normally overlook.

Step 2: Acknowledge FOUR things you can touch
Notice four things you're currently touching or can reach out and touch. The texture of your clothes, the smoothness of a table, the coolness of a wall. Pay attention to the sensations - rough, smooth, warm, cold.

Step 3: Acknowledge THREE things you can hear
Stop and listen. What can you hear right now? Maybe it's traffic outside, someone typing, your own breathing, birds singing. Don't judge the sounds, just acknowledge them.

Step 4: Acknowledge TWO things you can smell
This can be challenging indoors. You might smell your coffee, fresh air through a window, or even just the absence of smell. If you can't smell anything distinct, that's okay - move to your clothes or hair.

Step 5: Acknowledge ONE thing you can taste
What can you taste right now? Coffee, mint from gum, or just the taste of your mouth. If needed, take a sip of water to engage this sense.

Why it works:

When you're anxious, your mind is often in the future, worrying about what might happen. This technique anchors you firmly in the present moment. It's impossible to be fully present and anxious about the future simultaneously.

The systematic nature of counting down also gives your mind a task to focus on, interrupting the anxiety spiral. Each sense you engage further pulls you away from anxious thoughts and into physical reality.

When to use it:

• Before an exam or presentation
• During a panic attack
• When intrusive thoughts become overwhelming
• Before bed if your mind is racing
• In social situations that feel overwhelming
• During any moment of high stress

Practice tip:

Try the technique when you're calm first, so it becomes familiar. Then when anxiety strikes, the technique will feel more natural and accessible.

Remember: There's no "wrong" way to do this exercise. If you struggle with one sense, spend more time on another. The goal is simply to shift your attention from internal worry to external reality.

If anxiety continues to significantly impact your daily life, please reach out to our wellbeing team for additional support.`
    },
    {
      id: '2',
      category: 'Sleep',
      title: 'Sleep Hygiene: Creating Your Wind-Down Routine',
      description: 'Disconnect from screens 30 minutes before bed. Consistent sleep schedules improve both mood and academic performance.',
      readTime: 4,
      thumbnail: 'https://images.unsplash.com/photo-1743748978909-169017ab0720?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWRyb29tJTIwc2xlZXAlMjBwZWFjZWZ1bHxlbnwxfHx8fDE3Njc2NzI4NTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      author: 'Prof James Chen, Sleep Research Centre',
      publishDate: '2 January 2026',
      fullContent: `Quality sleep is fundamental to mental health, academic performance, and overall wellbeing. Yet many students struggle with sleep, particularly during exam periods or when adjusting to university life.

Understanding Sleep Hygiene:

Sleep hygiene refers to the habits and practices that support good quality sleep. Think of it as creating the optimal conditions for your body and mind to rest and recover.

Your 30-Minute Wind-Down Routine:

The hour before bed is crucial. Here's how to make it count:

30 Minutes Before Bed:
Put away all screens - phones, laptops, tablets. The blue light from screens suppresses melatonin, the hormone that makes you sleepy. If you must use a device, enable night mode and keep brightness low.

Instead, try:
• Reading a physical book (not an e-reader with backlight)
• Gentle stretching or yoga
• Listening to calm music or a podcast
• Writing in a journal
• Having a warm bath or shower

20 Minutes Before Bed:
Prepare your environment. Your bedroom should be cool (around 16-18°C), dark, and quiet. Invest in:
• Blackout curtains or an eye mask
• Earplugs if needed
• Comfortable bedding

Dim the lights throughout your accommodation. This signals to your brain that night-time is approaching.

10 Minutes Before Bed:
Do a "brain dump" if your mind is busy. Keep a notepad by your bed and write down:
• Tomorrow's to-do list
• Any worrying thoughts
• Things you're grateful for

This helps clear your mind and reduces the anxiety of forgetting something important.

The Consistency Factor:

Your body loves routine. Try to:
• Go to bed at the same time each night (yes, even weekends)
• Wake up at the same time each morning
• Avoid long lie-ins that disrupt your rhythm

If you must have a lie-in, limit it to 1-2 hours later than usual.

What to Avoid:

• Caffeine after 2pm (it stays in your system for 5-7 hours)
• Heavy meals within 2-3 hours of bedtime
• Intense exercise within 3 hours of sleep
• Alcohol before bed (it disrupts sleep quality)
• Naps after 3pm

Dealing with Racing Thoughts:

If you can't fall asleep after 20 minutes, get up and do something calming in low light until you feel sleepy. Lying awake creates an association between your bed and wakefulness.

When to Seek Help:

If sleep problems persist for more than a few weeks, or if they're significantly affecting your studies or wellbeing, contact our support services. Sleep disorders are treatable, and you don't have to struggle alone.

Remember: Good sleep isn't a luxury - it's a necessity for your academic success and mental health.`
    },
    {
      id: '3',
      category: 'Relationships',
      title: 'The Power of Micro-Connections',
      description: 'Small social interactions throughout the day can significantly boost your mood and sense of belonging.',
      readTime: 3,
      isNew: true,
      thumbnail: 'https://images.unsplash.com/photo-1669454571964-55e862eca265?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllbmRzJTIwd2Fsa2luZyUyMHRhbGtpbmd8ZW58MXx8fHwxNzY3NzM2MjE4fDA&ixlib=rb-4.1.0&q=80&w=1080',
      author: 'Dr Emily Roberts, Social Psychology',
      publishDate: '6 January 2026',
      fullContent: `We often think meaningful connection requires deep conversations or significant time investment. But research shows that brief, positive interactions throughout the day - what psychologists call "micro-connections" - have a profound impact on our wellbeing.

What Are Micro-Connections?

Micro-connections are brief, positive social interactions:
• Smiling at someone you pass on campus
• A quick "how are you?" to a classmate
• Thanking the barista who makes your coffee
• Holding the door for someone
• A brief chat while waiting for a lecture

These moments typically last less than a minute, but their impact is significant.

The Science Behind It:

Studies show that people who engage in more micro-connections throughout the day report:
• Higher levels of happiness and life satisfaction
• Reduced feelings of loneliness
• Greater sense of belonging
• Lower stress and anxiety
• Improved mood that lasts for hours

Even interactions with strangers activate our brain's reward centres and trigger the release of oxytocin, the "bonding hormone."

Why They Matter at University:

University can feel isolating, especially in the first year or for mature students. You might:
• Be far from home
• Not have established friendships yet
• Feel like everyone else has their social life sorted
• Spend a lot of time studying alone

Micro-connections combat this isolation without the pressure of committing to full friendships or social events.

How to Create More Micro-Connections:

Make Eye Contact and Smile:
It's simple but powerful. When you pass someone, make brief eye contact and smile. Most people will smile back, creating a tiny moment of shared humanity.

Be Present:
Put your phone away when walking between lectures or waiting in queues. This makes you more approachable and aware of opportunities for brief connection.

Use People's Names:
If you know someone's name, use it. "Thanks, Jamie!" feels more personal than just "thanks."

Ask How Someone Is:
And actually listen to the answer. Even a 30-second exchange where you're genuinely present matters.

Notice and Compliment:
"I like your jacket" or "Great point you made in the seminar" costs nothing and brightens someone's day.

Overcoming Social Anxiety:

If social interaction feels daunting:
• Start small - just make eye contact and smile
• Remember most people appreciate friendly gestures
• It's okay if every interaction isn't perfect
• Practice with "low stakes" interactions (shop staff, librarians)

The Ripple Effect:

When you initiate a micro-connection, you're not just improving your own wellbeing. You're:
• Potentially brightening someone else's difficult day
• Creating a more friendly campus culture
• Making it easier for the next person to connect
• Building skills that will serve you throughout life

Challenge for This Week:

Aim for five micro-connections per day. It might feel awkward at first, but like any skill, it gets easier with practice.

Remember: You don't need to become everyone's best friend. Sometimes the smallest gestures create the biggest impacts on how we feel.`
    },
    {
      id: '4',
      category: 'Exercise',
      title: '10-Minute Movement Breaks for Better Focus',
      description: 'Short bursts of movement can improve focus and reduce stress. Your body and mind work together.',
      readTime: 3,
      thumbnail: 'https://images.unsplash.com/photo-1741676516502-69250deb38ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwZXhlcmNpc2luZyUyMG91dGRvb3JzfGVufDF8fHx8MTc2NzczNjIxOXww&ixlib=rb-4.1.0&q=80&w=1080',
      author: 'Lisa Thompson, Sports & Wellbeing',
      publishDate: '30 December 2025',
      fullContent: `Long study sessions can leave you mentally fatigued and physically stiff. But what if 10 minutes of movement could reset your focus and boost your productivity?

The Study-Movement Connection:

When you sit for extended periods, your brain receives less oxygen, cognitive function declines, and stress hormones accumulate. Movement reverses these effects:

• Increases blood flow to the brain
• Releases endorphins that improve mood
• Reduces cortisol (stress hormone)
• Resets attention and focus
• Prevents the physical tension that builds during study

You don't need a gym membership or athletic ability. You just need 10 minutes and the willingness to move.

Your 10-Minute Movement Menu:

Choose what appeals to you in the moment:

The Quick Walk (Outdoors):
Step outside and walk briskly for 10 minutes. Notice your surroundings - trees, sky, people. The combination of movement, fresh air, and natural light is powerful. Bonus points if you can walk somewhere green.

The Dance Break (Your Room):
Put on a song you love and dance. Seriously. Close your curtains if you're self-conscious and just move. It's impossible to dance and stay stressed simultaneously.

The Stretch Session (Anywhere):
Focus on areas that tighten during study:
• Neck rolls
• Shoulder shrugs and rolls
• Spinal twists
• Hip openers
• Hamstring stretches

Hold each stretch for 30 seconds and breathe deeply.

The Stair Challenge (Any Building):
Find stairs and walk up and down for 10 minutes. It raises your heart rate quickly and requires no equipment.

The YouTube Workout (Your Room):
Search for "10-minute bodyweight workout" and follow along. There are thousands of free options requiring no equipment.

Timing Your Movement Breaks:

Research suggests optimal timing:
• Every 50-60 minutes of study
• When you notice your concentration wavering
• Before starting a challenging topic
• When you feel frustration building
• As a reward for completing a task

Strategic Study Sessions:

Try the "50-10" method:
• Study for 50 minutes with full focus
• Move for 10 minutes
• Repeat

This creates a sustainable rhythm that actually increases total productive time compared to marathon study sessions.

Overcoming Resistance:

Your brain will resist:
"I don't have time for breaks"
"I'll lose my flow"
"I'll do it later"

The truth:
• The break makes the remaining study time more efficient
• Your "flow" likely faded 20 minutes ago
• "Later" rarely comes

If 10 minutes feels like too much, start with 5. Some movement is infinitely better than none.

The Exam Period Strategy:

During high-pressure times, movement breaks become even more crucial. They:
• Prevent burnout
• Help information consolidate in memory
• Reduce anxiety
• Improve sleep quality
• Maintain physical health

Physical Health Matters Too:

Beyond the focus benefits, regular movement breaks:
• Prevent back and neck pain
• Reduce eye strain (especially if you go outside)
• Maintain energy levels
• Support your immune system (crucial during exam season)

Making It Habitual:

• Set an alarm every hour
• Create a movement playlist
• Find a study buddy and move together
• Track your breaks for a week and notice the impact

Remember: You're not a brain on a stick. You're a whole person, and your mind works better when your body moves.

Start today: Set a timer for 50 minutes. When it goes off, move for 10. Notice how you feel when you return to studying.`
    },
    {
      id: '5',
      category: 'Study',
      title: 'The Pomodoro Technique for Better Focus',
      description: 'Work for 25 minutes, take a 5-minute break. This method maintains concentration and prevents burnout.',
      readTime: 4,
      thumbnail: 'https://images.unsplash.com/photo-1752920299210-0b727800ea50?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwc3R1ZHlpbmclMjBsaWJyYXJ5fGVufDF8fHx8MTc2NzczNjIxOHww&ixlib=rb-4.1.0&q=80&w=1080',
      author: 'Dr Michael Foster, Learning & Development',
      publishDate: '28 December 2025',
      fullContent: `The Pomodoro Technique is one of the most popular time management methods among students and professionals. Developed in the 1980s by Francesco Cirillo, it transforms how you approach studying by working with your brain's natural attention span rather than against it.

How It Works:

The basic structure is simple:
1. Choose a specific task to work on
2. Set a timer for 25 minutes
3. Work with complete focus until the timer rings
4. Take a 5-minute break
5. After four "pomodoros," take a longer 15-30 minute break

That's it. The simplicity is part of its power.

Why 25 Minutes?

Research shows that focused attention typically starts to wane after 20-25 minutes. The Pomodoro Technique:
• Matches your brain's optimal focus window
• Creates urgency that enhances concentration
• Makes daunting tasks feel manageable
• Provides regular opportunities to rest and reset

The technique works because it's sustainable. Anyone can focus intensely for 25 minutes, even on difficult or boring material.

Setting Up for Success:

Before You Start:
• Choose one specific task per pomodoro
• Gather all materials you need
• Silence your phone (or leave it in another room)
• Close unnecessary browser tabs
• Tell housemates you're unavailable
• Have water nearby

During the 25 Minutes:
• Focus solely on your chosen task
• If a distraction arises, write it down to address later
• Don't check your phone
• Don't answer messages
• If you finish early, review what you've done

The Break Is Sacred:
Your break is not optional - it's essential to the technique's effectiveness.

5-Minute Breaks:
• Stand up and move
• Look away from your screen (prevent eye strain)
• Stretch
• Get a drink
• Step outside if possible
• Don't check social media (it won't refresh you)

15-30 Minute Breaks (After Four Pomodoros):
• Leave your study space
• Eat something
• Take a proper walk
• Call a friend
• Do something completely different

Adapting for Different Tasks:

Easy/Familiar Material:
You might complete more in one pomodoro. Great! Use remaining time to review or refine.

Difficult/New Material:
Progress might feel slow. That's normal. Trust the process. Four focused pomodoros (just 2 hours) on difficult material achieves more than 4 hours of distracted study.

Creative Work (Essays, Projects):
The timer can feel restrictive. Try 45-minute pomodoros with 10-minute breaks instead.

Revision:
Perfect for pomodoros. Each 25-minute session can cover one topic or set of flashcards.

Common Pitfalls and Solutions:

"I was just getting into flow!"
If you're genuinely in deep focus, you can extend to 40-45 minutes. But be honest - most "flow" is actually procrastination in disguise.

"I keep getting distracted"
Keep a "distraction list" next to you. When thoughts arise ("I should email Dr Smith"), write them down and return to focus. Address them during breaks.

"25 minutes feels too short"
Start with what works for you - even 15 minutes. Gradually increase. The structure matters more than the exact duration.

"I skip the breaks"
You're sabotaging yourself. Breaks aren't wasted time - they're when your brain processes and consolidates information. Work without breaks leads to diminishing returns.

Tracking Your Progress:

Keep a simple log:
• Date
• Task
• Number of pomodoros completed
• Distractions noted
• How you felt

Over time, you'll:
• See how much you accomplish
• Identify your peak focus times
• Notice patterns in distractions
• Build motivation from visible progress

The Psychological Benefits:

Beyond productivity, the Pomodoro Technique:
• Reduces study anxiety (you only need to focus for 25 minutes)
• Prevents procrastination (starting is less daunting)
• Creates achievable goals (complete X pomodoros today)
• Builds sustainable habits (you can do this every day)
• Improves work-life balance (clear stop points)

For Exam Revision:

The technique excels during exam periods:
• Prevents burnout from marathon study sessions
• Ensures regular breaks for information retention
• Creates structure in unstructured days
• Makes overwhelming revision feel manageable

Try This Week:

Commit to using the Pomodoro Technique for all study sessions for one week. Track:
• How many pomodoros you complete
• How you feel compared to usual study sessions
• Whether you accomplish more than expected

Most students who try it properly never go back to their old study habits.

Tools to Try:
• Forest app (grows a tree during focus time)
• Pomofocus website (simple, free timer)
• Traditional kitchen timer (removes digital distractions)
• Pen and paper tracking (surprisingly effective)

Remember: The Pomodoro Technique isn't about cramming more study into your day. It's about making the study you do more effective, sustainable, and less stressful.`
    },
    {
      id: '6',
      category: 'Stress',
      title: 'Box Breathing for Instant Calm',
      description: 'This simple four-step breathing technique activates your parasympathetic nervous system to reduce stress.',
      readTime: 2,
      thumbnail: 'https://images.unsplash.com/photo-1758274526705-396a79a15ad5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmVhdGhpbmclMjBleGVyY2lzZSUyMG5hdHVyZXxlbnwxfHx8fDE3Njc3MDIzNjV8MA&ixlib=rb-4.1.0&q=80&w=1080',
      author: 'Dr Rachel Adams, Mindfulness Specialist',
      publishDate: '27 December 2025',
      fullContent: `When stress hits - before a presentation, during exam anxiety, or in any overwhelming moment - your breathing often becomes quick and shallow. Box breathing is a simple, science-backed technique that can calm your nervous system in minutes.

What Is Box Breathing?

Also called "square breathing" or "four-square breathing," this technique uses equal counts for four phases of breathing:

1. Breathe IN for 4 counts
2. HOLD for 4 counts
3. Breathe OUT for 4 counts
4. HOLD for 4 counts

Repeat the cycle 4 times minimum (hence "box" - four equal sides).

How to Do It:

Find a comfortable position - sitting or standing. You can close your eyes or keep them open with a soft gaze.

Cycle 1:
• Breathe in slowly through your nose for 4 seconds
• Hold that breath for 4 seconds
• Exhale slowly through your mouth for 4 seconds
• Hold empty for 4 seconds

Repeat for at least 4 complete cycles (about 90 seconds total).

The Science:

Box breathing works by activating your parasympathetic nervous system - your body's "rest and digest" mode. This:

• Slows your heart rate
• Lowers blood pressure
• Reduces cortisol (stress hormone)
• Increases oxygen to your brain
• Shifts you from "fight or flight" to "rest and recover"

The equal counts create rhythm that focuses your mind, interrupting the stress response.

When to Use It:

Box breathing is remarkably versatile. Use it:

Before stressful events:
• Exams or presentations
• Difficult conversations
• Job interviews
• Meeting new people

During acute stress:
• When you feel panic rising
• During conflict or confrontation
• When you receive upsetting news
• In moments of anger or frustration

For better focus:
• Before studying difficult material
• When your mind feels scattered
• To transition between tasks
• When you notice your attention drifting

For better sleep:
• When your mind is racing at bedtime
• If you wake during the night
• As part of your wind-down routine

Adapting the Technique:

If 4 counts feels uncomfortable:

Start with 3 seconds:
Some people find 4 seconds too long initially, especially the holds. That's fine - use 3. The rhythm matters more than the exact duration.

Extend to 5 or 6 seconds:
Once comfortable, you can extend each phase. Longer counts deepen the relaxation effect.

Skip the holds:
If holding feels uncomfortable, just do the in-breath for 4 and out-breath for 4. You still gain benefits from slow, controlled breathing.

Tips for Success:

Breathe through your nose:
Nasal breathing is calming and filters air better than mouth breathing. But if you're congested, mouth breathing is fine.

Make your exhale smooth:
Imagine you're slowly deflating a balloon. The slower and smoother your exhale, the more calming the effect.

Focus on the count:
If your mind wanders, gently bring attention back to counting. The focus itself is therapeutic.

Place a hand on your belly:
Feel it rise as you inhale and fall as you exhale. This helps you breathe deeply rather than shallow chest breathing.

Don't force it:
Breathing should never feel strained. If you feel dizzy or uncomfortable, return to normal breathing and try shorter counts.

Building the Habit:

Practice daily:
Try box breathing every morning for a week, even when you're not stressed. This builds the skill so it's available when you need it urgently.

Use triggers:
Link it to existing habits: "Every time I sit down to study, I'll do 4 cycles of box breathing first."

Set reminders:
Phone alarms can prompt practice sessions until it becomes automatic.

Why It Works So Well:

Unlike many stress management techniques, box breathing:
• Requires no equipment or special space
• Takes only 90 seconds to feel effects
• Can be done anywhere, anytime
• Is completely free
• Has no side effects
• Works even if you're sceptical

It's used by everyone from Navy SEALs to athletes to surgeons before high-pressure situations.

Beyond Emergency Use:

Regular practice offers cumulative benefits:
• Lower baseline anxiety
• Better emotional regulation
• Improved focus and concentration
• Enhanced stress resilience
• Better sleep quality

Your Challenge:

Right now, before continuing to read anything else, try four cycles of box breathing. Notice how you feel before and after.

Then commit to practising once daily this week. Set a phone reminder if needed.

Many students report that box breathing becomes their go-to tool for managing university stress - in the exam hall, before presentations, during difficult moments. It's a skill that will serve you far beyond your studies.

Remember: Your breath is always with you, which means you always have access to calm. You just need to remember to use it.`
    }
  ];

  const filters = ['All', 'Stress', 'Sleep', 'Study', 'Relationships', 'Exercise', 'Anxiety'];

  const filteredArticles = activeFilter === 'All' 
    ? articles 
    : articles.filter(article => article.category === activeFilter);

  const newArticlesCount = articles.filter(a => a.isNew).length;

  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
      'Anxiety': { bg: '#FEE2E2', text: '#DC2626', icon: '#EF4444' },
      'Sleep': { bg: '#E0E7FF', text: '#4338CA', icon: '#6366F1' },
      'Stress': { bg: '#FED7E2', text: '#BE185D', icon: '#EC4899' },
      'Relationships': { bg: '#D1FAE5', text: '#065F46', icon: '#10B981' },
      'Exercise': { bg: '#FFE4E6', text: '#BE123C', icon: '#F43F5E' },
      'Study': { bg: '#DBEAFE', text: '#1E40AF', icon: '#3B82F6' }
    };
    return colors[category] || { bg: '#F3F4F6', text: '#4B5563', icon: '#6B7280' };
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, JSX.Element> = {
      'Anxiety': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M2 12h20"/>
        </svg>
      ),
      'Sleep': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      ),
      'Stress': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01"/>
        </svg>
      ),
      'Relationships': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
      'Exercise': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6.5 6.5l11 11M6.5 17.5l11-11M2 12h4m16 0h-4M12 2v4m0 16v-4"/>
        </svg>
      ),
      'Study': (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      )
    };
    return icons[category] || null;
  };

  // If an article is selected, show detail view
  if (selectedArticle) {
    return (
      <ArticleDetailPage 
        article={selectedArticle} 
        onBack={() => setSelectedArticle(null)}
        universityName={universityName}
        universityLogo={universityLogo}
      />
    );
  }

  // Otherwise show article list
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      paddingBottom: '80px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#FFFFFF',
        paddingTop: '60px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '20px',
        borderBottom: '1px solid #F0F0F0'
      }}>
        {/* University Branding */}
        <div style={{
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            {universityLogo && (
              <img 
                src={universityLogo} 
                alt={universityName} 
                style={{
                  maxWidth: '96px',
                  maxHeight: '96px',
                  flexShrink: 0
                }}
              />
            )}
            <div style={{
              fontSize: universityLogo ? '18px' : '20px',
              color: '#1a1a1a',
              fontWeight: '500',
              letterSpacing: '0.3px',
              textAlign: universityLogo ? 'left' : 'center'
            }}>
              {universityName}
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 4px 0',
            lineHeight: '1.2'
          }}>
            Wellbeing Content
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666666',
            margin: 0,
            lineHeight: '1.4'
          }}>
            Expert tips, resources and insights from your student wellbeing team
          </p>
          {newArticlesCount > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '12px',
              padding: '6px 14px',
              background: 'linear-gradient(135deg, #A855F7, #C084FC)',
              color: 'white',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {newArticlesCount} new article{newArticlesCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{
        padding: '20px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          minWidth: 'min-content'
        }}>
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '10px 20px',
                background: activeFilter === filter ? '#5B8FED' : 'white',
                color: activeFilter === filter ? 'white' : '#666666',
                border: activeFilter === filter ? 'none' : '1px solid #E0E0E0',
                borderRadius: '24px',
                fontSize: '14px',
                fontWeight: activeFilter === filter ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                boxShadow: activeFilter === filter ? '0 2px 8px rgba(91, 143, 237, 0.3)' : 'none'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div style={{
        padding: '0 20px 24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {filteredArticles.map((article) => {
          const categoryColors = getCategoryColor(article.category);
          
          return (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              style={{
                background: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Thumbnail Image */}
              <div style={{
                width: '100%',
                height: '200px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <img 
                  src={article.thumbnail}
                  alt={article.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                {article.isNew && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #10B981, #34D399)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                  }}>
                    New
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ padding: '20px' }}>
                {/* Category Badge and Time */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: categoryColors.bg,
                    color: categoryColors.text,
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    <span style={{ color: categoryColors.icon, display: 'flex', alignItems: 'center' }}>
                      {getCategoryIcon(article.category)}
                    </span>
                    {article.category}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#999999',
                    fontSize: '13px'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {article.readTime} min
                  </div>
                </div>

                {/* Title */}
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  margin: '0 0 10px 0',
                  lineHeight: '1.3'
                }}>
                  {article.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: '14px',
                  color: '#666666',
                  lineHeight: '1.6',
                  margin: '0 0 16px 0'
                }}>
                  {article.description}
                </p>

                {/* Read More Link */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#5B8FED',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'gap 0.2s'
                }}>
                  Read full article
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredArticles.length === 0 && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px auto',
            background: '#F3F4F6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 8px 0'
          }}>
            No articles found
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#999999',
            margin: 0
          }}>
            Try selecting a different category
          </p>
        </div>
      )}
    </div>
  );
}