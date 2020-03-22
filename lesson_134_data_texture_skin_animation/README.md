# Fun with WebGL 2.0 - 134 - Data Texture Skin Animation
**Description**:
So we retargeted some animation and managed to save it back out as a GLTF file to reuse. So lets try something
different. Lets take our animation and transform it into something that will be usable on the GPU, then
store all this data into a texture buffer. So why do this? Well, we can store boat loads of information in
a texture plus we have random access to the data. So if we're smart in saving our data as Pixels, we can move
all our skin animation code into a shader that will do all the work on the gpu. So no more figuring out the
world space position / rotation for every bone for every frame, all that will be cached onto a texture and
we'll no longer need to recalculate the animation again, victory.


### Links of Interest
https://webgl2fundamentals.org/webgl/lessons/webgl-skinning.html


### Links
* [Lesson on Youtube](https://youtu.be/QF4Kk4KQoII)
* [Youtube Series PlayList](https://www.youtube.com/playlist?list=PLMinhigDWz6emRKVkVIEAaePW7vtIkaIF)
* [Twitter](https://twitter.com/SketchpunkLabs)
* [Patreon](https://www.patreon.com/sketchpunk)