# Fun with WebGL 2.0 - 128 - Spring / Jiggle / Dynamic Bone 
**Description**:
In this lesson, we're going to learn how to handle spring movement on an armature / skeleton bone. This is
known sometimes as a Jiggle or Dynamic Bone, just another tool for procedural animations. The base idea
is pretty simple. You use spring movement to move an invisible point around that follows along to match
the resting position in worldspace for the bone's tail.

From there, you get the angle between 2 rays. Bone's head to the Trail's resting position, then from the 
bone's head to the following point. With the angle at hand, all we need to do is get the cross product of 
the two rays to get an axis of rotation. Angle plus Axis, we can easily create a quaternion that we can
apply to the bind pose rotation of the bone for a final springy bone movement. It sounds complicated,
but the code is fairly simple. I also setup visual aids to help drive the concept home for most people.



### Links of Interest
https://wiki.unity3d.com/index.php/JiggleBone


### Links
* [Lesson on Youtube](https://youtu.be/q18Rhjgwqek)
* [Youtube Series PlayList](https://www.youtube.com/playlist?list=PLMinhigDWz6emRKVkVIEAaePW7vtIkaIF)
* [Twitter](https://twitter.com/SketchpunkLabs)
* [Patreon](https://www.patreon.com/sketchpunk)