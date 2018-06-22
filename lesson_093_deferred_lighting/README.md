# Fun with WebGL 2.0 - 093 - Deferred Lighting
**Description**:
We're going to expand our Deferred rendering to handle lighting. This means we render our scene in a custom frame buffer that saves different bits of data for each fragment, like color, normals, emission, world position. Once the scene is done rendering we then take those texture buffers and render the scene once with lighting. This optimizes the process since we dont waste time calculating light on fragments that may get replaced by another object rendered later. For fun, I added emissive color support plus added bloom effect at the end of the scene to make emissive colors glow.

For an added bonus, I have commented out a sample in which we handle deferred lighting into another custom framebuffer then copy over the depth information as well which we then can continue to adding to the frame with forward rendering before we finally render things out to the screen buffer.

### Links of Interest

https://learnopengl.com/Advanced-Lighting/Deferred-Shading

https://hacks.mozilla.org/2014/01/webgl-deferred-shading/

https://github.com/tiansijie/Tile_Based_WebGL_DeferredShader

https://hacks.mozilla.org/2014/01/webgl-deferred-shading/

https://github.com/tsherif/webgl2examples/blob/master/deferred.html

### Fungi Changes

https://github.com/sketchpunk/Fungi/commit/752f2f962f01af4d84e6c4dbb39aa561a6b55816

### Links
* [Lesson on Youtube](https://youtu.be/zacV3I0AEhI)
* [Youtube Series PlayList](https://www.youtube.com/playlist?list=PLMinhigDWz6emRKVkVIEAaePW7vtIkaIF)
* [Twitter](https://twitter.com/SketchpunkLabs)
* [Patreon](https://www.patreon.com/sketchpunk)