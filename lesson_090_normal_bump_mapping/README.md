# Fun with WebGL 2.0 - 090 - Normal Bump Mapping
**Description**:

Today we explore three different methods in which we can use a normal texture to apply special lighting and depth to our 3d models. First we start with how to compute the normal, tangent and bitangent (binormal) that we need to create a TBN 3x3 Matrix that allows use to move things around between world space and tangent space. Then we take a step further and replace the matrix with a quaternion, which we no longer need to keep all the tbn data in buffers. Lastly we look at how to compute tangent space using a snippet of GLSL code in the fragment shader that allows use to bypass the need to even compute the tangent and bitangent for a mesh.


### Links of Interest

https://stackoverflow.com/questions/5255806/how-to-calculate-tangent-and-binormal

https://code.google.com/archive/p/kri/wikis/Quaternions.wiki

http://www.opengl-tutorial.org/intermediate-tutorials/tutorial-13-normal-mapping/#normal-textures

https://github.com/mattatz/ShibuyaCrowd/blob/master/source/shaders/common/quaternion.glsl

https://code.google.com/archive/p/kri/wikis/Quaternions.wiki

https://gist.github.com/BeRo1985/5042cc79e55012a2c724aecf880c8be9

http://www.thetenthplanet.de/archives/1180

http://pocket.gl/normal-maps/

http://planetpixelemporium.com/planets.html


### Fungi Changes

https://github.com/sketchpunk/Fungi/commit/b726258fb01235ebf4b8ce1a8eb3784436ae3665


### Links
* [Lesson on Youtube](https://youtu.be/vemIyDpBBH8)
* [Youtube Series PlayList](https://www.youtube.com/playlist?list=PLMinhigDWz6emRKVkVIEAaePW7vtIkaIF)
* [Twitter](https://twitter.com/SketchpunkLabs)
* [Patreon](https://www.patreon.com/sketchpunk)