# Fun with WebGL 2.0 - 136 - Quaternion Swing and Twist
**Description**:
This is the second video in relation to IK Animation. Before dealing with IK stuff, I want to go through a few math ideas that I found to be important when trying to animate characters with IK. This second one is about breaking rotation into a set of 2 rotations that makes it easy to store and translate to IK Bones. The basic idea is to swing a bone to face a specific direction, then apply a roll / twist, for example swing your arm then just rotating just your wrist. Saving data as a direction vector plus an angle of rotation for the twist makes it pretty easy to store in a vec4 data type and works pretty well to share overall animation to various ik rigs.

### Links of Interest
http://allenchou.net/2018/05/game-math-swing-twist-interpolation-sterp/


### Links
* [Lesson on Youtube](https://youtu.be/hT5asIUBoX8)
* [Youtube Series PlayList](https://www.youtube.com/playlist?list=PLMinhigDWz6emRKVkVIEAaePW7vtIkaIF)
* [Twitter](https://twitter.com/SketchpunkLabs)
* [Patreon](https://www.patreon.com/sketchpunk)