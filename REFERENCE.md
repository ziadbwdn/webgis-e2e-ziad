```
CLIP - Cuts polygon A using polygon B as a cookie cutter
=========================================================

Input Polygon A:          Input Polygon B:          Output (A clipped by B):
y                         y                         y
8  ****                   8                         8
7 ******                  7      ######             7
6********                 6     ########            6    **
5**********               5    ##########           5   ****
4************             4   ############          4  ******
3************             3   ############          3  ******
2 **********              2    ##########           2   ****
1  ********               1     ########            1    **
0   ******                0      ######             0
    ****                                            
   0123456789            0123456789                0123456789
         x                      x                          x

Feature A: (0,0) to (6,8)    Feature B: (4,0) to (10,7)   Result: (4,1) to (6,6)
Area covers x:0-6, y:0-8     Area covers x:4-10, y:0-7    Only A within B bounds


INTERSECT - Keeps only the overlapping area
============================================

Input Polygon A:          Input Polygon B:          Output (A ∩ B):
y                         y                         y
8  ****                   8                         8
7 ******                  7      ######             7
6********                 6     ########            6
5**********               5    ##########           5    ##
4************             4   ############          4   ####
3************             3   ############          3   ####
2 **********              2    ##########           2    ##
1  ********               1     ########            1
0   ******                0      ######             0
    ****                                            
   0123456789            0123456789                0123456789
         x                      x                          x

Feature A: (0,0) to (6,8)    Feature B: (4,0) to (10,7)   Result: (4,2) to (6,6)
Left edge: x=0               Left edge: x=4               Overlap x:4-6, y:2-6
Right edge: x=6              Right edge: x=10             Only shared area


MERGE - Combines polygons keeping all boundaries
=================================================

Input Polygon A:          Input Polygon B:          Output (A + B):
y                         y                         y
8  ****                   8                         8  ****
7 ******                  7      ######             7 ******  ######
6********                 6     ########            6********########
5**********               5    ##########           5********************
4************             4   ############          4************************
3************             3   ############          3************************
2 **********              2    ##########           2********************
1  ********               1     ########            1 ********########
0   ******                0      ######             0  ******  ######
    ****                                                ****
   0123456789            0123456789                01234567890123
         x                      x                          x

Feature A: (0,0) to (6,8)    Feature B: (4,0) to (10,7)   Result: Both features
Centroid: (3,4)              Centroid: (7,3.5)            A at (0-6), B at (4-10)
ID: A001                     ID: B001                     ID: A001, B001 (2 features)


DISSOLVE - Combines polygons removing internal boundaries
==========================================================

Input Polygon A:          Input Polygon B:          Output (dissolved):
y                         y                         y
8  ****                   8                         8  @@@@
7 ******                  7      ######             7 @@@@@@@@@@@@
6********                 6     ########            6@@@@@@@@@@@@@@@@
5**********               5    ##########           5@@@@@@@@@@@@@@@@@@@@
4************             4   ############          4@@@@@@@@@@@@@@@@@@@@@@@@
3************             3   ############          3@@@@@@@@@@@@@@@@@@@@@@@@
2 **********              2    ##########           2@@@@@@@@@@@@@@@@@@@@
1  ********               1     ########            1 @@@@@@@@@@@@@@@@
0   ******                0      ######             0  @@@@@@@@@@@@
    ****                                                @@@@
   0123456789            0123456789                01234567890123
         x                      x                          x

Feature A: (0,0) to (6,8)    Feature B: (4,0) to (10,7)   Result: One feature
Overlaps at x:4-6            Overlaps at x:4-6            Combined (0,0) to (10,8)
Attribute: Type=Forest       Attribute: Type=Forest       Attribute: Type=Forest
                                                          Internal border removed


UNION - Combines all areas from both polygons
==============================================

Input Polygon A:          Input Polygon B:          Output (A ∪ B):
y                         y                         y
8  ****                   8                         8  @@@@
7 ******                  7      ######             7 @@@@@@@@@@@@
6********                 6     ########            6@@@@@@@@@@@@@@@@
5**********               5    ##########           5@@@@@@@@@@@@@@@@@@@@
4************             4   ############          4@@@@@@@@@@@@@@@@@@@@@@@@
3************             3   ############          3@@@@@@@@@@@@@@@@@@@@@@@@
2 **********              2    ##########           2@@@@@@@@@@@@@@@@@@@@
1  ********               1     ########            1 @@@@@@@@@@@@@@@@
0   ******                0      ######             0  @@@@@@@@@@@@
    ****                                                @@@@
   0123456789            0123456789                01234567890123
         x                      x                          x

Feature A: (0,0) to (6,8)    Feature B: (4,0) to (10,7)   Result: One feature
Min X,Y: (0,0)               Min X,Y: (4,0)               Bounding box: (0,0)-(10,8)
Max X,Y: (6,8)               Max X,Y: (10,7)              Total area combined


BUFFER - Expands polygon by specified distance
===============================================

Input Polygon:            Buffer Distance: 1 unit   Output (buffered):
y                                                   y
8                                                   9 @@@@@@@@
7   ****                                            8@@@@@@@@@@
6  ******                                           7@@@@@@@@@@@@
5 ********                                          6@@@@@@@@@@@@@@
4**********                                         5@@@@@@@@@@@@@@@@
3**********                                         4@@@@@@@@@@@@@@@@
2 ********                                          3@@@@@@@@@@@@@@@@
1  ******                                           2@@@@@@@@@@@@@@
0   ****                                            1@@@@@@@@@@@@
                                                    0 @@@@@@@@
   0123456789                                       01234567890
         x                                                  x

Feature: (2,0) to (6,7)      Distance: 1 unit              Result: (1,-1) to (7,8)
Center point: (4,3.5)        Applied to all edges         Expanded by 1 in all directions
Original area: ~20 sq units  Buffer radius: 1              New area: ~35 sq units
```

**Coordinate Analysis:**

- **CLIP**: Result coordinates are constrained to B's extent (x:4-10, y:0-7)
- **INTERSECT**: Result only contains overlap zone (x:4-6, y:2-6)
- **MERGE**: Maintains separate features with original coordinates
- **DISSOLVE**: Creates single feature spanning full extent (x:0-10, y:0-8)
- **UNION**: Similar to dissolve but explicitly shows combined area
- **BUFFER**: Expands geometry uniformly by specified distance in all directions