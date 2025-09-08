CS106 HW1

Theo Datta
github: Theo-Datta-115
email: theodatta@college.harvard.edu

bolt url: https://bolt.new/~/sb1-xzhxy3ms
netify url: https://lovely-frangipane-32467f.netlify.app/

description: This was much more tedious to build than I thought. My goal was to be able to understand the employment patterns of a specific zip code, using the census API. The main problem with this was that in order to achieve the level of depth I wanted, I needed to actually find and query multiple different APIs to get my desired result. I needed to find a way to easily access a zip code->county name mapping, which was harder than I thought it should be (I found a working soltuion on the third try, using a HUD API call, after multiple failed attempts with deprecated databases). I then had to query a NAICS API to be able to sequentially pull different job specification levels, which I then put into the census API calls. Figuring out that I needed all of these steps took time and iteration, and it was complicated enough so that Bolt had lots of trouble (more so when the context window got saturated), and I had to do a fair bit of manual debugging and model hand-holding.

As an aside, Bolt is wholly too weak to do this task on the free version. The fact that this homework implies use of Bolt essentially forced me to buy the paid package ($25/m), which I would have much prefered not to do.

This took me ~6h, partially because I have so little actual develpment experience - I was more efficient by the end. 
