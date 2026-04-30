1 - determine the direction (left top right bottom) at which the logic interface "look at" visually

Using the pin group i of interface A retrieve pointsTo (Direction2D (left top right bottom))  from it's userData
Then find the component group of the pin and its current y rotation (in scene radians then)
for note the correspondance between core rotation (clockwise 0 90 180 270) and the scene rotation is
0 -> 0
90 -> -PI/2
180 -> -PI
270 -> -3*PI/2

From that compute the current absolutePointsTo of the interface. Implement this new function in src/scene/shared/utils/GeometryUtils.ts
interfaceAbsolutePointsTo(left, 0) = left
interfaceAbsolutePointsTo(top, 0) = top
interfaceAbsolutePointsTo(right, 0) = right
interfaceAbsolutePointsTo(bottom, 0) = bottom

interfaceAbsolutePointsTo(left, -PI/2) = top
interfaceAbsolutePointsTo(top, -PI/2) = right
interfaceAbsolutePointsTo(right, -PI/2) = bottom
interfaceAbsolutePointsTo(bottom, -PI/2) = left

interfaceAbsolutePointsTo(left, -PI) = right
interfaceAbsolutePointsTo(top, -PI) = bottom
interfaceAbsolutePointsTo(right, -PI) = left
interfaceAbsolutePointsTo(bottom, -PI) = top

interfaceAbsolutePointsTo(left, -3*PI/2) = bottom
interfaceAbsolutePointsTo(top, -3*PI/2) = left
interfaceAbsolutePointsTo(right, -3*PI/2) = top
interfaceAbsolutePointsTo(bottom, -3*PI/2) = right