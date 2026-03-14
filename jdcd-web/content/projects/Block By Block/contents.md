A while back, [I spent some time working on porting MCP Minecraft 1.2.5 to C# for fun](https://github.com/JamDoggie/BlockByBlock). This project uses OpenTK for OpenGL and GLFW. I started off with a very rudimentary Java to C# converter, and spent a couple weeks hand-porting everything else to get all the data types and libraries to match up and produce identical results.

After that, I spent some time rewriting and "modernizing" the rendering code. I converted everything to utilize modern OpenGL 4.6 APIs, and got the game working outside of a compatibility context (only allowing modern OpenGL calls to run.)

This project required intimate understanding of both C# and Java data types, the common Java and C# libraries, and GLSL shader code. This was done in late 2022, before LLMs were very useful. Outside of GitHub Copilot auto-complete, everything was done by hand. These days I try to embrace AI and agentic workflows with a very hands-on approach.

This project was purely made for fun, and cannot really be used as a replacement for the actual game. As it is, it would be an objectively worse way to play the game. Although most things do work, it should purely be viewed for educational purposes.

I also experimented recently with getting this project to render and take inputs from Godot. You can see that in the previews of this project as well.